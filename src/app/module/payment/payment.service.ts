import Stripe from "stripe";
import { PaymentStatus, ParticipationStatus, InvitationStatus, Role } from "../../../generated/prisma/enums";
import { uploadFileToCloudinary } from "../../config/cloudinary.config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../config/stripe.config";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { sendEmail } from "../../utils/email";
import { generateInvoicePdf } from "./payment.utils";
import { QueryBuilder } from "../../utils/QueryBuilder";

const handlerStripeWebhookEvent = async (event: Stripe.Event) => {
    // Idempotency check — skip already-processed events
    const stripeEventId = event.id;

    const existingPaymentEvent = await prisma.payment.findFirst({
        where: {
            metadata: {
                path: ['stripeEventId'],
                equals: stripeEventId
            }
        }
    });

    if (existingPaymentEvent) {
        console.log(`Event ${event.id} already processed. Skipping`);
        return { message: `Event ${event.id} already processed. Skipping` };
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            const paymentId = session.metadata?.paymentId;
            const participationId = session.metadata?.participationId;
            const type = session.metadata?.type;

            if (!paymentId || !participationId || !type) {
                console.error("⚠️ Missing metadata in webhook event");
                return { message: "Missing metadata" };
            }

            // Fetch payment with related user and event data for the invoice
            const paymentData = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: { select: { name: true, email: true } },
                    event: { select: { title: true, startDate: true } }
                }
            });

            if (!paymentData) {
                console.error(`⚠️ Payment ${paymentId} not found.`);
                return { message: "Payment not found" };
            }

            let pdfBuffer: Buffer | null = null;

            const result = await prisma.$transaction(async (tx) => {
                const status = session.payment_status === "paid" ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

                let invoiceUrl: string | null = null;

                // Generate and upload invoice PDF only on successful payment
                if (status === PaymentStatus.COMPLETED) {
                    try {
                        pdfBuffer = await generateInvoicePdf({
                            invoiceId: paymentId,
                            attendeeName: paymentData.user.name,
                            attendeeEmail: paymentData.user.email,
                            eventTitle: paymentData.event.title,
                            eventDate: paymentData.event.startDate.toISOString(),
                            amount: paymentData.amount,
                            currency: paymentData.currency,
                            transactionId: session.payment_intent as string || "",
                            gatewayRef: session.id,
                            paymentDate: new Date().toISOString(),
                        });

                        const cloudinaryResponse = await uploadFileToCloudinary(
                            pdfBuffer,
                            `invoice-${paymentId}-${Date.now()}.pdf`
                        );

                        invoiceUrl = cloudinaryResponse?.secure_url || null;
                        console.log(`✅ Invoice PDF generated and uploaded for payment ${paymentId}`);
                    } catch (pdfError) {
                        console.error("❌ Error generating/uploading invoice PDF:", pdfError);
                        // Non-fatal — continue with payment update
                    }
                }

                // Update Payment
                const updatedPayment = await tx.payment.update({
                    where: { id: paymentId },
                    data: {
                        status,
                        transactionId: session.payment_intent as string || null,
                        gatewayRef: session.id,
                        invoiceUrl,
                        metadata: {
                            stripeEventId: event.id,
                            paymentGatewayData: JSON.parse(JSON.stringify(session)), // full Stripe session stored for audit
                        }
                    }
                });

                // Update Participation
                if (status === PaymentStatus.COMPLETED) {
                    let nextStatus: ParticipationStatus = ParticipationStatus.PENDING;

                    if (type === "PUBLIC" || type === "INVITATION_PAID" || type === "PRIVATE_PAID") {
                        nextStatus = ParticipationStatus.CONFIRMED;
                    }

                    const updatedParticipation = await tx.participation.update({
                        where: { id: participationId },
                        data: {
                            status: nextStatus,
                            approvedAt: nextStatus === ParticipationStatus.CONFIRMED ? new Date() : undefined,
                        }
                    });

                    if (type === "INVITATION_PAID" && updatedParticipation.invitationId) {
                        await tx.invitation.update({
                            where: { id: updatedParticipation.invitationId },
                            data: {
                                status: InvitationStatus.ACCEPTED,
                                respondedAt: new Date()
                            }
                        });
                    }
                } else if (status === PaymentStatus.FAILED) {
                    await tx.participation.update({
                        where: { id: participationId },
                        data: {
                            status: ParticipationStatus.CANCELLED,
                            cancelledAt: new Date(),
                        }
                    });
                }

                return { updatedPayment, invoiceUrl };
            });

            // Send invoice email outside the transaction so a failed email doesn't roll back the payment
            if (session.payment_status === "paid" && result.invoiceUrl) {
                try {
                    await sendEmail({
                        to: paymentData.user.email,
                        subject: `Payment Confirmation & Invoice - ${paymentData.event.title}`,
                        templateName: "invoice",
                        templateData: {
                            attendeeName: paymentData.user.name,
                            invoiceId: paymentId,
                            transactionId: session.payment_intent as string || "",
                            gatewayRef: session.id,
                            paymentDate: new Date().toLocaleDateString(),
                            eventTitle: paymentData.event.title,
                            eventDate: new Date(paymentData.event.startDate).toLocaleDateString(),
                            amount: paymentData.amount,
                            currency: paymentData.currency,
                            invoiceUrl: result.invoiceUrl,
                        },
                        attachments: [
                            {
                                filename: `Invoice-${paymentId}.pdf`,
                                content: pdfBuffer || Buffer.from(""),
                                contentType: 'application/pdf'
                            }
                        ]
                    });

                    console.log(`✅ Invoice email sent to ${paymentData.user.email}`);
                } catch (emailError) {
                    console.error("❌ Error sending invoice email:", emailError);
                    // Log but don't fail the webhook
                }
            }

            console.log(`✅ Payment ${session.payment_status} for participation ${participationId}`);
            break;
        }

        case "checkout.session.expired": {
            const session = event.data.object as Stripe.Checkout.Session;
            const paymentId = session.metadata?.paymentId;
            const participationId = session.metadata?.participationId;

            if (paymentId) {
                await prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: paymentId },
                        data: {
                            status: PaymentStatus.FAILED,
                            gatewayRef: session.id,
                            metadata: {
                                stripeEventId: event.id,
                                paymentGatewayData: JSON.parse(JSON.stringify(session)),
                            }
                        }
                    });
                    if (participationId) {
                        await tx.participation.update({
                            where: { id: participationId },
                            data: {
                                status: ParticipationStatus.CANCELLED,
                                cancelledAt: new Date(),
                            }
                        });
                    }
                });
            }
            console.log(`Checkout session ${session.id} expired. Marking associated payment and participation as failed.`);
            break;
        }

        case "payment_intent.payment_failed": {
            const session = event.data.object as Stripe.PaymentIntent;
            console.log(`Payment intent ${session.id} failed.`);
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return { message: `Webhook Event ${event.id} processed successfully` };
};

const getMyPayments = async (user: IRequestUser, queryParams: any) => {
    let whereCondition: any = {};

    if (user.role === Role.PARTICIPANT) {
        whereCondition = { userId: user.userId };
    } else if (user.role === Role.ORGANIZER) {
        whereCondition = {
            OR: [
                { userId: user.userId },
                { event: { organizerId: user.userId } }
            ]
        };
    } else if (user.role === Role.ADMIN) {
        whereCondition = {};
    }

    const builder = new QueryBuilder(prisma.payment, queryParams, {
        searchableFields: ["transactionId", "event.title", "user.name", "user.email"],
        filterableFields: ["status"],
    })
    .where(whereCondition)
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
        user: { 
            select: { id: true, name: true, email: true, image: true } 
        },
        event: {
            select: { id: true, title: true, bannerImage: true, category: true, startDate: true }
        }
    });

    return builder.execute();
};

export const PaymentService = {
    handlerStripeWebhookEvent,
    getMyPayments
};
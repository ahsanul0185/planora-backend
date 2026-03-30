import status from "http-status";
import { InvitationStatus, ParticipationStatus, PaymentStatus, PaymentGateway } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { sendEmail } from "../../utils/email";
import { QueryBuilder } from "../../utils/QueryBuilder";

const sendInvitations = async (eventId: string, emails: string[], user: IRequestUser) => {
    const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.userId },
        include: { organizer: { select: { name: true } } }
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the host");
    }

    if (new Date() >= event.startDate) {
        throw new AppError(status.BAD_REQUEST, "Cannot send invitations for past or ongoing events.");
    }

    const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];

    // Find registered users from emails
    const registeredUsers = await prisma.user.findMany({
        where: { email: { in: uniqueEmails } },
        select: { id: true, email: true, name: true }
    });

    const registeredUserMap = new Map(registeredUsers.map(u => [u.email, u]));

    // Check existing invitations by email
    const existingInvitations = await prisma.invitation.findMany({
        where: { eventId, receiverEmail: { in: uniqueEmails }, status: { in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED] } },
        select: { receiverEmail: true }
    });

    const alreadyInvitedEmails = new Set(existingInvitations.map(i => i.receiverEmail));

    const emailsToInvite = uniqueEmails.filter(email => !alreadyInvitedEmails.has(email));

    if (emailsToInvite.length === 0) {
        throw new AppError(status.BAD_REQUEST, "All provided emails are already invited.");
    }

    if (event.maxParticipants) {
        const participantCount = await prisma.participation.count({
            where: {
                eventId,
                status: {
                    in: [ParticipationStatus.CONFIRMED, ParticipationStatus.APPROVED]
                }
            }
        });

        const pendingInvitationsCount = await prisma.invitation.count({
            where: {
                eventId,
                status: InvitationStatus.PENDING
            }
        });

        const totalSpotTaken = participantCount + pendingInvitationsCount;
        const availableSpots = event.maxParticipants - totalSpotTaken;

        if (availableSpots <= 0) {
            throw new AppError(status.BAD_REQUEST, "Event has reached maximum participant capacity limit.");
        }

        if (emailsToInvite.length > availableSpots) {
            throw new AppError(status.BAD_REQUEST, `Cannot send invitations. Only ${availableSpots} spot(s) are remaining for this event.`);
        }
    }

    const invitationsData = emailsToInvite.map(email => {
        const registeredMatch = registeredUserMap.get(email);
        return {
            senderId: user.userId,
            receiverEmail: email,
            receiverId: registeredMatch ? registeredMatch.id : null, 
            eventId,
            expiresAt: event.startDate,
            status: InvitationStatus.PENDING,
        };
    });

    await prisma.invitation.createMany({
        data: invitationsData
    });

    // Send emails asynchronously
    emailsToInvite.forEach(email => {
        const registeredMatch = registeredUserMap.get(email);
        
        sendEmail({
            to: email,
            subject: `You're Invited! ${event.title}`,
            templateName: "invitation",
            templateData: {
                inviteeName: registeredMatch ? registeredMatch.name : "there",
                eventName: event.title,
                hostName: event.organizer.name,
                eventDate: new Date(event.startDate).toLocaleDateString(),
                fee: event.registrationFee > 0 ? `${event.registrationFee} ${event.currency}` : "Free",
                actionUrl: `${envVars.FRONTEND_URL}/dashboard/events/invitations`
            }
        }).catch(err => console.error("Failed to send invitation email to:", email, err));
    });

    return {
        invitedCount: emailsToInvite.length,
        alreadyProcessedCount: uniqueEmails.length - emailsToInvite.length,
        message: `Successfully sent invitations to ${emailsToInvite.length} users.`
    };
};

const getEventInvitations = async (eventId: string, user: IRequestUser, queryParams: any) => {
    const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.userId },
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the host");
    }

    const builder = new QueryBuilder(prisma.invitation, queryParams, {
        searchableFields: ["receiverEmail", "receiver.name"],
        filterableFields: ["status"],
    })
        .where({ eventId })
        .search()
        .filter()
        .sort()
        .paginate()
        .include({
            receiver: { select: { id: true, name: true, image: true } },
        });

    return await builder.execute();
};

const getMyInvitations = async (user: IRequestUser, queryParams: any) => {
    const builder = new QueryBuilder(prisma.invitation, queryParams, {
        filterableFields: ["status"],
    })
        .where({ receiverEmail: user.email })
        .sort()
        .paginate()
        .include({
            event: { select: { id: true, title: true, bannerImage: true, startDate: true, registrationFee: true, currency: true } },
            sender: { select: { id: true, name: true, image: true } },
        });

    return await builder.execute();
};

const revokeInvitation = async (invId: string, user: IRequestUser) => {
    const invitation = await prisma.invitation.findUnique({
        where: { id: invId },
        include: { event: { select: { organizerId: true } } }
    });

    if (!invitation || invitation.event.organizerId !== user.userId) {
        throw new AppError(status.NOT_FOUND, "Invitation not found or you do not have permission");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(status.BAD_REQUEST, "Only pending invitations can be revoked");
    }

    return await prisma.invitation.update({
        where: { id: invId },
        data: {
            status: InvitationStatus.REVOKED,
            revokedAt: new Date()
        }
    });
};

const declineInvitation = async (invId: string, user: IRequestUser) => {
    const invitation = await prisma.invitation.findUnique({
        where: { id: invId },
    });

    if (!invitation || invitation.receiverEmail !== user.email) {
        throw new AppError(status.NOT_FOUND, "Invitation not found");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(status.BAD_REQUEST, `Invitation is already ${invitation.status}`);
    }

    return await prisma.invitation.update({
        where: { id: invId },
        data: {
            status: InvitationStatus.DECLINED,
            receiverId: user.userId, // Link on interaction
            respondedAt: new Date()
        }
    });
};

const acceptInvitation = async (invId: string, user: IRequestUser) => {
    const invitation = await prisma.invitation.findUnique({
        where: { id: invId },
        include: { event: true }
    });

    if (!invitation || invitation.receiverEmail !== user.email) {
        throw new AppError(status.NOT_FOUND, "Invitation not found");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(status.BAD_REQUEST, `Invitation is already ${invitation.status}`);
    }
    
    if (invitation.event.registrationFee > 0) {
        throw new AppError(status.BAD_REQUEST, "This is a paid event. Please use the pay-accept endpoint.");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const updatedInvite = await tx.invitation.update({
            where: { id: invId },
            data: {
                status: InvitationStatus.ACCEPTED,
                receiverId: user.userId, // Link on interaction 
                respondedAt: new Date(),
            }
        });

        const participation = await tx.participation.create({
            data: {
                eventId: invitation.eventId,
                userId: user.userId,
                status: ParticipationStatus.CONFIRMED,
                approvedAt: new Date(),
                fromInvitation: true,
                invitationId: invId,
            }
        });

        return { participation, updatedInvite };
    });

    return transactionResult;
};

const payAndAcceptInvitation = async (invId: string, user: IRequestUser) => {
    const invitation = await prisma.invitation.findUnique({
        where: { id: invId },
        include: { event: true }
    });

    if (!invitation || invitation.receiverEmail !== user.email) {
        throw new AppError(status.NOT_FOUND, "Invitation not found");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(status.BAD_REQUEST, `Invitation is already ${invitation.status}`);
    }

    if (invitation.event.registrationFee <= 0) {
        throw new AppError(status.BAD_REQUEST, "This is a free event. Please use the accept endpoint.");
    }

    const { event } = invitation;

    const transaction = await prisma.$transaction(async (tx) => {
        // Link user to invite to be safe since they've initiated intent
        await tx.invitation.update({
            where: { id: invId },
            data: { receiverId: user.userId }
        });

        // check existing participation from this invite
        let participation = await tx.participation.findUnique({
            where: { invitationId: invId }
        });

        let paymentId: string;

        if (participation) {
            if (participation.paymentId) {
                paymentId = participation.paymentId;
            } else {
                const newPayment = await tx.payment.create({
                    data: {
                        eventId: event.id,
                        userId: user.userId,
                        amount: event.registrationFee,
                        currency: event.currency || "USD",
                        gateway: PaymentGateway.STRIPE,
                        status: PaymentStatus.PENDING,
                    }
                });
                paymentId = newPayment.id;
                await tx.participation.update({
                    where: { id: participation.id },
                    data: { paymentId }
                });
            }
        } else {
            const newPayment = await tx.payment.create({
                data: {
                    eventId: event.id,
                    userId: user.userId,
                    amount: event.registrationFee,
                    currency: event.currency || "USD",
                    gateway: PaymentGateway.STRIPE,
                    status: PaymentStatus.PENDING,
                }
            });
            paymentId = newPayment.id;

            participation = await tx.participation.create({
                data: {
                    eventId: event.id,
                    userId: user.userId,
                    status: ParticipationStatus.PENDING,
                    fromInvitation: true,
                    invitationId: invId,
                    paymentId,
                }
            });
        }

        return { paymentId, participationId: participation.id };
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: (event.currency || "USD").toLowerCase(),
                    product_data: {
                        name: `Join Event (Invitation): ${event.title}`,
                    },
                    unit_amount: Math.round(event.registrationFee * 100),
                },
                quantity: 1,
            }
        ],
        metadata: {
            eventId: event.id,
            userId: user.userId,
            paymentId: transaction.paymentId,
            participationId: transaction.participationId,
            type: "INVITATION_PAID", // Webhook will use this to confirm the Invitation
        },
        success_url: `${envVars.FRONTEND_URL}/dashboard/events/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${envVars.FRONTEND_URL}/dashboard/invitations?error=payment_cancelled`,
    });

    return { paymentUrl: session.url };
};

export const InvitationService = {
    sendInvitations,
    getEventInvitations,
    getMyInvitations,
    revokeInvitation,
    declineInvitation,
    acceptInvitation,
    payAndAcceptInvitation
};

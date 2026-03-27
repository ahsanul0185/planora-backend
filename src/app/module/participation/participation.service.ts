import status from "http-status";
import { parse } from "json2csv";
import { EventStatus, EventVisibility, ParticipationStatus, PaymentStatus, PaymentGateway } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { validateEventForJoining, validateEventForPaidJoining } from "./participation.utils";

const joinPublicFreeEvent = async (eventId: string, user: IRequestUser) => {
    await validateEventForJoining(eventId, user.userId, EventVisibility.PUBLIC);

    const participation = await prisma.participation.create({
        data: {
            eventId,
            userId: user.userId,
            status: ParticipationStatus.CONFIRMED,
            approvedAt: new Date(),
        },
    });

    return participation;
};

const requestPrivateFreeEvent = async (eventId: string, user: IRequestUser) => {
    await validateEventForJoining(eventId, user.userId, EventVisibility.PRIVATE);

    const participation = await prisma.participation.create({
        data: {
            eventId,
            userId: user.userId,
            status: ParticipationStatus.PENDING,
        },
    });

    return participation;
};

const joinPublicPaidEvent = async (eventId: string, user: IRequestUser) => {
    const { event, existingParticipation } = await validateEventForPaidJoining(eventId, user.userId, EventVisibility.PUBLIC);

    const transaction = await prisma.$transaction(async (tx) => {
        let paymentId: string;
        let participationId: string;

        if (existingParticipation) {
            participationId = existingParticipation.id;
            
            if (existingParticipation.payment) {
                paymentId = existingParticipation.payment.id;
            } else {
                const newPayment = await tx.payment.create({
                    data: {
                        eventId,
                        userId: user.userId,
                        amount: event.registrationFee,
                        currency: event.currency || "USD",
                        gateway: PaymentGateway.STRIPE,
                        status: PaymentStatus.PENDING,
                    }
                });
                paymentId = newPayment.id;
                await tx.participation.update({
                    where: { id: participationId },
                    data: { paymentId }
                });
            }
        } else {
            const newPayment = await tx.payment.create({
                data: {
                    eventId,
                    userId: user.userId,
                    amount: event.registrationFee,
                    currency: event.currency || "USD",
                    gateway: PaymentGateway.STRIPE,
                    status: PaymentStatus.PENDING,
                }
            });
            paymentId = newPayment.id;

            const newParticipation = await tx.participation.create({
                data: {
                    eventId,
                    userId: user.userId,
                    status: ParticipationStatus.PENDING,
                    paymentId,
                }
            });
            participationId = newParticipation.id;
        }

        return { paymentId, participationId };
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: (event.currency || "USD").toLowerCase(),
                    product_data: {
                        name: `Join Event: ${event.title}`,
                    },
                    unit_amount: Math.round(event.registrationFee * 100),
                },
                quantity: 1,
            }
        ],
        metadata: {
            eventId,
            userId: user.userId,
            paymentId: transaction.paymentId,
            participationId: transaction.participationId,
            type: "PUBLIC",
        },
        success_url: `${envVars.FRONTEND_URL}/dashboard/events/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${envVars.FRONTEND_URL}/events/${eventId}?error=payment_cancelled`,
    });

    return { paymentUrl: session.url };
};

const requestPrivatePaidEvent = async (eventId: string, user: IRequestUser) => {
    const { event, existingParticipation } = await validateEventForPaidJoining(eventId, user.userId, EventVisibility.PRIVATE);

    const transaction = await prisma.$transaction(async (tx) => {
        let paymentId: string;
        let participationId: string;

        if (existingParticipation) {
            participationId = existingParticipation.id;
            
            if (existingParticipation.payment) {
                paymentId = existingParticipation.payment.id;
            } else {
                const newPayment = await tx.payment.create({
                    data: {
                        eventId,
                        userId: user.userId,
                        amount: event.registrationFee,
                        currency: event.currency || "USD",
                        gateway: PaymentGateway.STRIPE,
                        status: PaymentStatus.PENDING,
                    }
                });
                paymentId = newPayment.id;
                await tx.participation.update({
                    where: { id: participationId },
                    data: { paymentId }
                });
            }
        } else {
            const newPayment = await tx.payment.create({
                data: {
                    eventId,
                    userId: user.userId,
                    amount: event.registrationFee,
                    currency: event.currency || "USD",
                    gateway: PaymentGateway.STRIPE,
                    status: PaymentStatus.PENDING,
                }
            });
            paymentId = newPayment.id;

            const newParticipation = await tx.participation.create({
                data: {
                    eventId,
                    userId: user.userId,
                    status: ParticipationStatus.PENDING,
                    paymentId,
                }
            });
            participationId = newParticipation.id;
        }

        return { paymentId, participationId };
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: (event.currency || "USD").toLowerCase(),
                    product_data: {
                        name: `Request to Join: ${event.title}`,
                    },
                    unit_amount: Math.round(event.registrationFee * 100),
                },
                quantity: 1,
            }
        ],
        metadata: {
            eventId,
            userId: user.userId,
            paymentId: transaction.paymentId,
            participationId: transaction.participationId,
            type: "PRIVATE",
        },
        success_url: `${envVars.FRONTEND_URL}/dashboard/events/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${envVars.FRONTEND_URL}/events/${eventId}?error=payment_cancelled`,
    });

    return { paymentUrl: session.url };
};

const getEventParticipants = async (eventId: string, user: IRequestUser, queryParams: any) => {
    const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.userId },
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the host");
    }

    // QueryBuilder defaults to sorting by 'createdAt' if sortBy is omitted. 
    // Participation has 'joinedAt' instead of 'createdAt'.
    if (!queryParams.sortBy) {
        queryParams.sortBy = "joinedAt";
    }

    const builder = new QueryBuilder(prisma.participation, queryParams, {
        searchableFields: ["user.name", "user.email"],
        filterableFields: ["status"],
    })
        .where({ eventId })
        .search()
        .filter()
        .sort()
        .paginate()
        .include({
            user: {
                select: { id: true, name: true, email: true, image: true },
            },
        });

    return builder.execute();
};

const exportParticipantsAsCSV = async (eventId: string, user: IRequestUser) => {
    const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.userId },
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the host");
    }

    const participants = await prisma.participation.findMany({
        where: { eventId },
        include: {
            user: { select: { name: true, email: true } },
        },
        orderBy: { joinedAt: "desc" },
    });

    if (participants.length === 0) {
        throw new AppError(status.BAD_REQUEST, "No participants to export");
    }

    const flatParticipants = participants.map((p) => ({
        ParticipationID: p.id,
        Name: p.user.name,
        Email: p.user.email,
        Status: p.status,
        JoinedAt: p.joinedAt,
        ApprovedAt: p.approvedAt || 'N/A',
        RejectedAt: p.rejectedAt || 'N/A',
        BannedAt: p.bannedAt || 'N/A',
        CancelledAt: p.cancelledAt || 'N/A',
    }));

    try {
        const csv = parse(flatParticipants);
        return csv;
    } catch (err) {
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to generate CSV");
    }
};

const updateParticipationStatus = async (eventId: string, participantUserId: string, newStatus: ParticipationStatus, user: IRequestUser) => {
    const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: user.userId },
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the host");
    }

    const participation = await prisma.participation.findFirst({
        where: { eventId, userId: participantUserId },
    });

    if (!participation) {
        throw new AppError(status.NOT_FOUND, "Participant not found");
    }

    if (participation.status === newStatus) {
        throw new AppError(status.BAD_REQUEST, `Participant is already ${newStatus}`);
    }

    if (newStatus === ParticipationStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Host cannot cancel a participation. Only the participant can cancel their own participation");
    }

    if (participation.status === ParticipationStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Cannot change status of a cancelled participation");
    }

    const updateData: any = { status: newStatus };

    switch (newStatus) {
        case ParticipationStatus.CONFIRMED:
            updateData.approvedAt = new Date();
            // Clear other terminal timestamps if transitioning to confirmed
            updateData.bannedAt = null;
            updateData.bannedReason = null;
            updateData.rejectedAt = null;
            updateData.rejectedReason = null;
            break;
        case ParticipationStatus.REJECTED:
            updateData.rejectedAt = new Date();
            break;
        case ParticipationStatus.BANNED:
            updateData.bannedAt = new Date();
            break;
        case ParticipationStatus.PENDING:
            updateData.approvedAt = null;
            updateData.rejectedAt = null;
            updateData.bannedAt = null;
            break;
    }

    const updatedParticipation = await prisma.participation.update({
        where: { id: participation.id },
        data: updateData,
        include: {
            user: { select: { id: true, name: true, email: true } }
        }
    });

    return updatedParticipation;
};

const cancelParticipation = async (eventId: string, user: IRequestUser) => {
    const participation = await prisma.participation.findFirst({
        where: { eventId, userId: user.userId },
    });

    if (!participation) {
        throw new AppError(status.NOT_FOUND, "Participation record not found");
    }

    if (participation.status === ParticipationStatus.CANCELLED) {
        throw new AppError(status.BAD_REQUEST, "Participation is already cancelled");
    }

    if (participation.status === ParticipationStatus.BANNED) {
        throw new AppError(status.BAD_REQUEST, "You are banned from this event");
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (event?.startDate && new Date(event.startDate) < new Date()) {
        throw new AppError(status.BAD_REQUEST, "Cannot cancel participation for a past/ongoing event");
    }

    const updated = await prisma.participation.update({
        where: { id: participation.id },
        data: {
            status: ParticipationStatus.CANCELLED,
            cancelledAt: new Date(),
        },
    });

    return updated;
};

export const ParticipationService = {
    joinPublicFreeEvent,
    requestPrivateFreeEvent,
    joinPublicPaidEvent,
    requestPrivatePaidEvent,
    getEventParticipants,
    exportParticipantsAsCSV,
    updateParticipationStatus,
    cancelParticipation,
};

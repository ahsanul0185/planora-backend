import status from "http-status";
import { parse } from "json2csv";
import { EventStatus, EventVisibility, ParticipationStatus } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { validateEventForJoining } from "./participation.utils";

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
    getEventParticipants,
    exportParticipantsAsCSV,
    updateParticipationStatus,
    cancelParticipation,
};

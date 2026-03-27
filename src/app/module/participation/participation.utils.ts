import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { EventStatus, EventVisibility, ParticipationStatus } from "../../../../generated/prisma/enums";

export const validateEventForJoining = async (eventId: string, userId: string, expectedVisibility: EventVisibility) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
    });

    if (!event || event.deletedAt) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    if (event.status !== EventStatus.PUBLISHED) {
        throw new AppError(status.BAD_REQUEST, "Event is not published");
    }

    if (event.visibility !== expectedVisibility) {
        throw new AppError(
            status.BAD_REQUEST,
            `This endpoint is for ${expectedVisibility.toLowerCase()} events only`
        );
    }

    if (event.registrationFee > 0) {
        throw new AppError(status.BAD_REQUEST, "This event is not free. Payment is required.");
    }

    const existingParticipation = await prisma.participation.findFirst({
        where: { eventId, userId },
    });

    if (existingParticipation) {
        if (existingParticipation.status === ParticipationStatus.CANCELLED || existingParticipation.status === ParticipationStatus.BANNED) {
            throw new AppError(status.FORBIDDEN, "You cannot rejoin an event you have cancelled or been banned from.");
        }
        throw new AppError(status.CONFLICT, `You already have a ${existingParticipation.status.toLowerCase()} participation for this event.`);
    }

    if (event.maxParticipants) {
        const currentParticipants = await prisma.participation.count({
            where: { eventId, status: ParticipationStatus.CONFIRMED },
        });

        if (currentParticipants >= event.maxParticipants) {
            throw new AppError(status.BAD_REQUEST, "Event has reached maximum capacity");
        }
    }

    return event;
};

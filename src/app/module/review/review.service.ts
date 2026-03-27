import status from "http-status";
import { ParticipationStatus, Role } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

const createReview = async (eventId: string, rating: number, body: string | undefined, user: IRequestUser) => {
    // Check if event exists
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    // Must be past the start date
    if (new Date() < event.startDate) {
        throw new AppError(status.BAD_REQUEST, "You cannot review an event before it starts");
    }

    // Must have a CONFIRMED participation
    const participation = await prisma.participation.findFirst({
        where: {
            eventId,
            userId: user.userId,
            status: ParticipationStatus.CONFIRMED
        }
    });

    if (!participation) {
        throw new AppError(status.FORBIDDEN, "Only confirmed attendees can leave a review");
    }

    // Must not have already reviewed
    const existingReview = await prisma.review.findFirst({
        where: {
            eventId,
            userId: user.userId,
            deletedAt: null
        }
    });

    if (existingReview) {
        throw new AppError(status.CONFLICT, "You have already reviewed this event");
    }

    // Edit deadline is 7 days from now
    const editDeadline = new Date();
    editDeadline.setDate(editDeadline.getDate() + 7);

    const review = await prisma.review.create({
        data: {
            rating,
            body,
            eventId,
            userId: user.userId,
            editDeadline
        }
    });

    return review;
};

const getEventReviews = async (eventId: string, queryParams: any) => {
    // We only fetch active reviews
    const builder = new QueryBuilder(prisma.review, queryParams, {
        filterableFields: ["rating"],
    })
        .where({ eventId, deletedAt: null })
        .sort()
        .paginate()
        .include({
            user: { select: { id: true, name: true, image: true } }
        });

    const result = await builder.execute();

    // Compute average rating
    const aggregate = await prisma.review.aggregate({
        where: { eventId, deletedAt: null },
        _avg: {
            rating: true
        }
    });

    return {
        ...result,
        meta: {
            ...result.meta,
            averageRating: aggregate._avg.rating ? parseFloat(aggregate._avg.rating.toFixed(2)) : null
        }
    };
};

const updateReview = async (reviewId: string, rating: number | undefined, body: string | undefined, user: IRequestUser) => {
    const review = await prisma.review.findUnique({
        where: { id: reviewId }
    });

    if (!review || review.deletedAt) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    if (review.userId !== user.userId) {
        throw new AppError(status.FORBIDDEN, "You can only edit your own reviews");
    }

    if (review.editDeadline && new Date() > review.editDeadline) {
        throw new AppError(status.BAD_REQUEST, "The 7-day edit window for this review has expired");
    }

    return await prisma.review.update({
        where: { id: reviewId },
        data: { rating, body }
    });
};

const deleteReview = async (reviewId: string, user: IRequestUser) => {
    const review = await prisma.review.findUnique({
        where: { id: reviewId }
    });

    if (!review || review.deletedAt) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    if (review.userId !== user.userId) {
        throw new AppError(status.FORBIDDEN, "You can only delete your own reviews");
    }

    if (review.editDeadline && new Date() > review.editDeadline) {
        throw new AppError(status.BAD_REQUEST, "The 7-day edit window to delete this review has expired");
    }

    return await prisma.review.update({
        where: { id: reviewId },
        data: { deletedAt: new Date() }
    });
};

const getMyReviews = async (user: IRequestUser, queryParams: any) => {
    const builder = new QueryBuilder(prisma.review, queryParams, {
        filterableFields: ["rating"],
    })
        .where({ userId: user.userId, deletedAt: null })
        .sort()
        .paginate()
        .include({
            event: { select: { id: true, title: true, bannerImage: true, startDate: true } }
        });

    return await builder.execute();
};

export const ReviewService = {
    createReview,
    getEventReviews,
    updateReview,
    deleteReview,
    getMyReviews
};
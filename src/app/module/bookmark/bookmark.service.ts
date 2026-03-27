import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

const createBookmark = async (eventId: string, user: IRequestUser) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    const existingBookmark = await prisma.bookmark.findFirst({
        where: { eventId, userId: user.userId }
    });

    if (existingBookmark) {
        throw new AppError(status.CONFLICT, "Event is already bookmarked");
    }

    return await prisma.bookmark.create({
        data: {
            eventId,
            userId: user.userId,
        }
    });
};

const deleteBookmark = async (eventId: string, user: IRequestUser) => {
    const bookmark = await prisma.bookmark.findFirst({
        where: { eventId, userId: user.userId }
    });

    if (!bookmark) {
        throw new AppError(status.NOT_FOUND, "Bookmark not found");
    }

    return await prisma.bookmark.delete({
        where: { id: bookmark.id }
    });
};

const getMyBookmarks = async (user: IRequestUser, queryParams: any) => {
    const builder = new QueryBuilder(prisma.bookmark, queryParams, {})
        .where({ userId: user.userId })
        .sort()
        .paginate()
        .include({
            event: { select: { id: true, title: true, bannerImage: true, startDate: true, registrationFee: true, currency: true } }
        });

    return await builder.execute();
};

export const BookmarkService = {
    createBookmark,
    deleteBookmark,
    getMyBookmarks
};

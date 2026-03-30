import status from "http-status";
import { EventStatus, EventVisibility } from "../../../generated/prisma/enums";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { ICreateEventPayload, IEventQueryParams, IUpdateEventPayload } from "./event.interface";
import { generateUniqueSlug } from "./event.utils";

const EVENT_INCLUDE = {
    organizer: { select: { id: true, name: true, email: true, image: true } },
    category: true,
    tags: { select: { id: true, name: true } },
    _count: { select: { participations: true, reviews: true } },
};

const EVENT_DETAIL_INCLUDE = {
    ...EVENT_INCLUDE,
    reviews: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" as const },
        take: 10,
    },
};


const getAllEvents = async (queryParams: IEventQueryParams) => {
    const builder = new QueryBuilder(
        prisma.event,
        queryParams,
        {
            searchableFields: ["title", "description", "organizer.name"],
            filterableFields: ["visibility", "status", "categoryId", "isFeatured"],
        }
    )
        .search()
        .filter()
        .where({ 
            status: EventStatus.PUBLISHED,
            // visibility: EventVisibility.PUBLIC,
            deletedAt: null,
        })
        .sort()
        .paginate()
        .include(EVENT_INCLUDE as any);

    // Handle isFree filter manually
    if (queryParams.isFree === "true") {
        builder.where({ registrationFee: 0 });
    } else if (queryParams.isFree === "false") {
        builder.where({ registrationFee: { gt: 0 } });
    }

    // Handle isFeatured filter manually if it comes as string boolean
    if (queryParams.isFeatured === "true") {
        builder.where({ isFeatured: true });
    } else if (queryParams.isFeatured === "false") {
        builder.where({ isFeatured: false });
    }

    return builder.execute();
};

const getFeaturedEvent = async () => {
    const event = await prisma.event.findFirst({
        where: { isFeatured: true, status: EventStatus.PUBLISHED, deletedAt: null },
        include: EVENT_DETAIL_INCLUDE as any,
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "No featured event found");
    }

    return event;
};

const getUpcomingEvents = async () => {
    return await prisma.event.findMany({
        where: {
            status: EventStatus.PUBLISHED,
            visibility: EventVisibility.PUBLIC,
            startDate: { gt: new Date() },
            deletedAt: null,
        },
        include: EVENT_INCLUDE as any,
        orderBy: { startDate: "asc" },
        take: 9,
    });
};

const getEventById = async (id: string) => {
    const event = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        include: EVENT_DETAIL_INCLUDE as any,
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    // Compute average rating
    const avgRating = await prisma.review.aggregate({
        where: { eventId: id },
        _avg: { rating: true },
    });

    return { ...event, averageRating: avgRating._avg.rating ?? 0 };
};

const getSimilarEvents = async (id: string) => {
    const event = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { categoryId: true },
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    return await prisma.event.findMany({
        where: {
            categoryId: event.categoryId,
            id: { not: id },
            status: EventStatus.PUBLISHED,
            visibility: EventVisibility.PUBLIC,
            deletedAt: null,
        },
        include: EVENT_INCLUDE as any,
        take: 4,
        orderBy: { startDate: "asc" },
    });
};


const createEvent = async (payload: ICreateEventPayload, user: IRequestUser) => {
    const { tags, ...eventData } = payload;

    const slug = await generateUniqueSlug(payload.title);

    await prisma.eventCategory.findUniqueOrThrow({ where: { id: payload.categoryId } });

    const event = await prisma.event.create({
        data: {
            ...eventData,
            startDate: new Date(eventData.startDate),
            endDate: new Date(eventData.endDate),
            registrationDeadline: eventData.registrationDeadline
                ? new Date(eventData.registrationDeadline)
                : null,
            status: eventData.status,
            slug,
            organizerId: user.userId,
            tags: tags?.length
                ? { create: tags.map((name) => ({ name })) }
                : undefined,
        },
        include: EVENT_INCLUDE as any,
    });

    return event;
};

const updateEvent = async (id: string, payload: IUpdateEventPayload, user: IRequestUser) => {
    const existing = await prisma.event.findFirst({
        where: { id, organizerId: user.userId, deletedAt: null },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the organizer");
    }

    // Guard: cannot change from Free to Paid if participants joined
    if (
        payload.registrationFee !== undefined &&
        existing.registrationFee === 0 &&
        payload.registrationFee > 0
    ) {
        const participantCount = await prisma.participation.count({ where: { eventId: id } });
        if (participantCount > 0) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot change event fee from Free to Paid after participants have joined"
            );
        }
    }

    // If a new banner image is uploaded and there was an old one, delete the old one from Cloudinary
    if (payload.bannerImage && existing.bannerImage && payload.bannerImage !== existing.bannerImage) {
        await deleteFileFromCloudinary(existing.bannerImage).catch((err) =>
            console.warn("Could not delete old event banner image from Cloudinary:", err)
        );
    }

    const { tags, ...rest } = payload;

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
            ...rest,
            startDate: rest.startDate ? new Date(rest.startDate) : undefined,
            endDate: rest.endDate ? new Date(rest.endDate) : undefined,
            registrationDeadline: rest.registrationDeadline
                ? new Date(rest.registrationDeadline)
                : undefined,
            ...(tags !== undefined && {
                tags: {
                    deleteMany: {},
                    create: tags.map((name) => ({ name })),
                },
            }),
        },
        include: EVENT_INCLUDE as any,
    });

    return updatedEvent;
};

const publishEvent = async (id: string, user: IRequestUser) => {
    const existing = await prisma.event.findFirst({
        where: { id, organizerId: user.userId, deletedAt: null },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Event not found or you are not the organizer");
    }

    if (existing.status !== EventStatus.DRAFT) {
        throw new AppError(status.BAD_REQUEST, `Event is already ${existing.status.toLowerCase()}`);
    }

    return await prisma.event.update({
        where: { id },
        data: { status: EventStatus.PUBLISHED },
        include: EVENT_INCLUDE as any,
    });
};

const deleteEvent = async (id: string, user: IRequestUser) => {
    const existing = await prisma.event.findFirst({
        where: { id, deletedAt: null },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    // Only organizer or admin can delete
    if (existing.organizerId !== user.userId && user.role !== "ADMIN") {
        throw new AppError(status.FORBIDDEN, "You are not authorized to delete this event");
    }

    await prisma.event.update({
        where: { id },
        data: {
            deletedAt: new Date(),
            status: EventStatus.CANCELLED,
        },
    });

    // TODO: Trigger refunds and notify participants when payment module is complete

    return { message: "Event deleted successfully" };
};

const toggleFeaturedEvent = async (id: string, user: IRequestUser) => {
    const existing = await prisma.event.findFirst({
        where: { id, deletedAt: null },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    if (user.role !== "ADMIN") {
        throw new AppError(status.FORBIDDEN, "You are not authorized to toggle featured status");
    }

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
            isFeatured: !existing.isFeatured,
        },
        include: EVENT_INCLUDE as any,
    });

    return updatedEvent;
};

const getMyEvents = async (user: IRequestUser, queryParams: IEventQueryParams) => {
    const builder = new QueryBuilder(
        prisma.event,
        queryParams,
        {
            searchableFields: ["title", "description", "organizer.name"],
            filterableFields: ["status", "visibility", "categoryId"],
        }
    )
        .search()
        .filter()
        .where({ organizerId: user.userId, deletedAt: null })
        .sort()
        .paginate()
        .include({
            ...EVENT_INCLUDE,
            _count: { select: { participations: true, reviews: true } },
        } as any);

    const result = await builder.execute();

    // Attach participant stats to each event
    const eventsWithStats = await Promise.all(
        (result.data as any[]).map(async (event) => {
            const [confirmed, pending] = await Promise.all([
                prisma.participation.count({ where: { eventId: event.id, status: "CONFIRMED" } }),
                prisma.participation.count({ where: { eventId: event.id, status: "PENDING" } }),
            ]);
            return { ...event, stats: { confirmed, pending } };
        })
    );

    return { data: eventsWithStats, meta: result.meta };
};

export const EventService = {
    getAllEvents,
    getFeaturedEvent,
    getUpcomingEvents,
    getEventById,
    getSimilarEvents,
    createEvent,
    updateEvent,
    publishEvent,
    deleteEvent,
    getMyEvents,
    toggleFeaturedEvent,
};

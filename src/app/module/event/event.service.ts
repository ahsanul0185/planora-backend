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
            filterableFields: ["visibility", "status", "categoryId", "isFeatured", "registrationFee"],
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

const getEventBySlug = async (slug: string) => {
    const event = await prisma.event.findUnique({
        where: { slug, deletedAt: null },
        include: EVENT_DETAIL_INCLUDE as any,
    });

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    // Compute average rating
    const avgRating = await prisma.review.aggregate({
        where: { eventId: event.id },
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

const seedEvents = async () => {
    const categories = [
        { id: "019d30e4-4c95-7028-b1ae-53d2c4941102", name: "Fashion", titles: ["Spring Gala", "Fashion Week 2026", "Eco-Friendly Styles", "Streetwear Expo", "Designers Workshop", "Luxury Runway", "Vintage Fair"] },
        { id: "019d30e4-0a2a-7229-b07f-529fb85de0c4", name: "Food & Drink", titles: ["Wine Tasting", "Street Food Fair", "Gourmet Dinner", "Cocktail Mixology", "Vegan Feast", "Baking Masterclass", "Coffee Festival"] },
        { id: "019d30e4-932f-77ad-b8e2-d2e882b030f1", name: "Music", titles: ["Jazz Night", "Rock Concert", "Indie Music Show", "Symphony Evening", "EDM Pulse", "Hip Hop Fest", "Acoustic Sessions"] },
        { id: "019d3d2b-5432-7609-a2c0-bd27b3280fbc", name: "Technology", titles: ["AI Summit", "Web3 Conference", "DevOps Meetup", "Cybersecurity Expo", "React Workshop", "Cloud Expo", "Startup Pitch"] }
    ];

    const organizers = [
        "FOf7JxbuACYovt8iOBH9hZrq6gz9pGKC", // Planora
        "FkniJORhgOiYbLbQQK1QACVVdfPhdaEd", // Anisuzzaman Khokan
        "KYsLKFffPd8pLnjcqQ0z0EjWdlWHNwzD"  // Sumaiya Akter
    ];


    const seededEvents = [];

    for (let i = 0; i < 30; i++) {
        const categoryPool = categories[Math.floor(Math.random() * categories.length)];
        const organizerId = organizers[Math.floor(Math.random() * organizers.length)];
        const title = `${categoryPool.titles[Math.floor(Math.random() * categoryPool.titles.length)]} #${Math.floor(Math.random() * 1000)}`;
        const slug = await generateUniqueSlug(title);
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 1);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + Math.floor(Math.random() * 5) + 2);

        const isOnline = Math.random() > 0.5;
        const registrationFee = Math.random() > 0.3 ? Math.floor(Math.random() * 100) + 10 : 0;
        const visibility = Math.random() > 0.2 ? EventVisibility.PUBLIC : EventVisibility.PRIVATE;
        const isFeatured = Math.random() > 0.8;

        const event = await prisma.event.create({
            data: {
                title,
                slug,
                description: `Experience the best of ${categoryPool.name} at this exclusive event. Don't miss out!`,
                status: EventStatus.PUBLISHED,
                visibility,
                isFeatured,
                startDate,
                endDate,
                timezone: "UTC",
                isOnline,
                venueName: isOnline ? null : "Grand Convention Center",
                venueAddress: isOnline ? null : "123 Event St, Downtown",
                onlineLink: isOnline ? "https://zoom.us/j/example" : null,
                registrationFee,
                currency: "USD",
                maxParticipants: Math.floor(Math.random() * 200) + 50,
                categoryId: categoryPool.id,
                organizerId,
            }
        });
        seededEvents.push(event);
    }

    return seededEvents;
};

export const EventService = {
    getAllEvents,
    getFeaturedEvent,
    getUpcomingEvents,
    getEventById,
    getEventBySlug,
    getSimilarEvents,
    createEvent,
    updateEvent,
    publishEvent,
    deleteEvent,
    getMyEvents,
    toggleFeaturedEvent,
    seedEvents,
};


import z from "zod";
import { EventVisibility } from "../../../../generated/prisma/enums";

export const createEventZodSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title too long"),
    description: z.string().optional(),
    bannerImage: z.string().url("Banner image must be a valid URL").optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).default(EventVisibility.PUBLIC),
    startDate: z.string().datetime("Invalid start date"),
    endDate: z.string().datetime("Invalid end date"),
    timezone: z.string().default("UTC"),
    isOnline: z.boolean().default(false),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    onlineLink: z.string().url("Online link must be a valid URL").optional(),
    registrationFee: z.number().nonnegative("Fee cannot be negative").default(0),
    currency: z.string().default("USD"),
    maxParticipants: z.number().int().positive().optional(),
    registrationDeadline: z.string().datetime("Invalid registration deadline").optional(),
    categoryId: z.string().uuid("Invalid category ID"),
    tags: z.array(z.string()).optional(),
}).refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    { message: "Start date must be before end date", path: ["endDate"] }
).refine(
    (data) => !data.registrationDeadline || new Date(data.registrationDeadline) <= new Date(data.startDate),
    { message: "Registration deadline must be before or on the start date", path: ["registrationDeadline"] }
);

export const updateEventZodSchema = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().optional(),
    bannerImage: z.string().url().optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timezone: z.string().optional(),
    isOnline: z.boolean().optional(),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    onlineLink: z.string().url().optional(),
    registrationFee: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    maxParticipants: z.number().int().positive().optional(),
    registrationDeadline: z.string().datetime().optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
});

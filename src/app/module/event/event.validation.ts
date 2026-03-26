import z from "zod";
import { EventStatus, EventVisibility } from "../../../../generated/prisma/enums";

// Coerce string numbers to numbers and string booleans to booleans for form-data compatibility
const booleanCoerce = z.preprocess((val) => {
    if (typeof val === "string") {
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
    }
    return val;
}, z.boolean());

const numberCoerce = z.coerce.number();

export const createEventZodSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title too long"),
    description: z.string().optional(),
    bannerImage: z.string().url("Banner image must be a valid URL").optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).default(EventVisibility.PUBLIC),
    startDate: z.string().datetime({ message: "Must be a valid ISO datetime" }),
    endDate: z.string().datetime({ message: "Must be a valid ISO datetime" }),
    timezone: z.string().default("UTC"),
    isOnline: booleanCoerce.default(false),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    onlineLink: z.string().url("Online link must be a valid URL").optional(),
    registrationFee: numberCoerce.nonnegative("Fee cannot be negative").default(0),
    currency: z.string().default("USD"),
    maxParticipants: numberCoerce.int().positive().optional(),
    registrationDeadline: z.string().datetime().optional(),
    categoryId: z.string().uuid("Invalid category ID"),
    status: z.enum([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.ENDED]).default(EventStatus.PUBLISHED),
    tags: z.preprocess((val) => {
        if (typeof val === "string") {
            return val.split(",").map((t) => t.trim()).filter(Boolean);
        }
        return val;
    }, z.array(z.string()).optional()),
}).refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    { message: "Start date must be before end date", path: ["endDate"] }
);

export const updateEventZodSchema = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().optional(),
    bannerImage: z.string().url().optional(),
    visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timezone: z.string().optional(),
    isOnline: booleanCoerce.optional(),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    onlineLink: z.string().url().optional(),
    registrationFee: numberCoerce.nonnegative().optional(),
    currency: z.string().optional(),
    maxParticipants: numberCoerce.int().positive().optional(),
    registrationDeadline: z.string().datetime().optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.preprocess((val) => {
        if (typeof val === "string") {
            return val.split(",").map((t) => t.trim()).filter(Boolean);
        }
        return val;
    }, z.array(z.string()).optional()),
});

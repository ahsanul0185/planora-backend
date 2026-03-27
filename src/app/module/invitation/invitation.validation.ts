import { z } from "zod";

export const sendInvitationsZodSchema = z.object({
    eventId: z.string().uuid({ message: "Invalid event ID" }),
    emails: z.array(z.string().email({ message: "Invalid email" }))
        .min(1, { message: "At least one email is required" })
        .max(50, { message: "Maximum 50 emails allowed per request" }),
});

export const InvitationValidation = {
    sendInvitationsZodSchema,
};

import { z } from "zod";
import { ParticipationStatus } from "../../../generated/prisma/enums";

export const updateStatusZodSchema = z.object({
    status: z.nativeEnum(ParticipationStatus, {
        message: "Invalid participation status provided",
    }),
});

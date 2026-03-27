import { z } from "zod";

export const createReviewZodSchema = z.object({
    rating: z.number().int().min(1).max(5, { message: "Rating must be between 1 and 5" }),
    body: z.string().optional()
});

export const updateReviewZodSchema = z.object({
    rating: z.number().int().min(1).max(5, { message: "Rating must be between 1 and 5" }).optional(),
    body: z.string().optional()
});

export const ReviewValidation = {
    createReviewZodSchema,
    updateReviewZodSchema
};
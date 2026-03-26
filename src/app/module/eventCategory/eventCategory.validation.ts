import z from "zod";

export const createCategoryZodSchema = z.object({
    name: z.string().min(2, "Category name must be at least 2 characters").max(50, "Category name must be at most 50 characters"),
    icon: z.string().optional(),
});

export const updateCategoryZodSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    icon: z.string().optional(),
});

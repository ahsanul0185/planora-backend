import z from "zod";

export const createAdminZodSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters").max(20, "Password must be at most 20 characters"),
    admin: z.object({
        name: z.string().min(5, "Name must be at least 5 characters").max(30, "Name must be at most 30 characters"),
        email: z.string().email("Invalid email address"),
        contactNumber: z.string().min(11, "Contact number must be at least 11 characters").max(14, "Contact number must be at most 14 characters").optional(),
        profilePhoto: z.string().url("Profile photo must be a valid URL").optional(),
    })
});

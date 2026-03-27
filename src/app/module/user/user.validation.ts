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

export const updateProfileZodSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters").optional(),
    image: z.string().url("Image must be a valid URL").optional(),
    bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
    birthdate: z.string().datetime({ message: "Invalid birthdate format (ISO string expected)" }).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 characters").optional(),
    address: z.string().optional(),
});

import { z } from "zod";

export const registerUserZodSchema = z.object({
    body: z.object({
        name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters").max(20, "Password must be at most 20 characters"),
        role: z.string().optional(),
        birthdate: z.string().datetime({ message: "Invalid birthdate format (ISO string expected)" }).optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        phoneNumber: z.string().min(10, "Phone number must be at least 10 characters").optional(),
        address: z.string().optional(),
    })
});

export const loginUserZodSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters").max(20, "Password must be at most 20 characters"),
    })
});

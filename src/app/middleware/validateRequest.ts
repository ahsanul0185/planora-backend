import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodObject<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // If data is sent as a JSON string in a 'data' field (common in form-data uploads)
        if (req.body.data) {
            try {
                req.body = JSON.parse(req.body.data);
            } catch (error) {
                return next(new Error("Invalid JSON in 'data' field"));
            }
        }

        const parsedResult = zodSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return next(parsedResult.error);
        }

        // Sanitizing and updating req.body
        req.body = parsedResult.data;

        next();
    };
};

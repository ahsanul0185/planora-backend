import status from "http-status";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateCategoryPayload, IUpdateCategoryPayload } from "./eventCategory.interface";

const getAllCategories = async () => {
    return await prisma.eventCategory.findMany({
        include: { _count: { select: { events: true } } },
        orderBy: { name: "asc" },
    });
};

const createCategory = async (payload: ICreateCategoryPayload) => {
    const exists = await prisma.eventCategory.findUnique({
        where: { name: payload.name },
    });

    if (exists) {
        throw new AppError(status.CONFLICT, "Category with this name already exists");
    }

    return await prisma.eventCategory.create({ data: payload });
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
    const existing = await prisma.eventCategory.findUniqueOrThrow({ where: { id } });

    // If a new icon is uploaded and there was an old one, delete the old one from Cloudinary
    if (payload.icon && existing.icon && payload.icon !== existing.icon) {
        await deleteFileFromCloudinary(existing.icon).catch((err) =>
            console.warn("Could not delete old category icon from Cloudinary:", err)
        );
    }

    return await prisma.eventCategory.update({ where: { id }, data: payload });
};

const deleteCategory = async (id: string) => {
    const existing = await prisma.eventCategory.findUniqueOrThrow({ where: { id } });

    const eventCount = await prisma.event.count({ where: { categoryId: id } });
    if (eventCount > 0) {
        throw new AppError(status.BAD_REQUEST, "Cannot delete category that has associated events");
    }

    await prisma.eventCategory.delete({ where: { id } });

    // Delete the icon from Cloudinary after successful DB deletion
    if (existing.icon) {
        await deleteFileFromCloudinary(existing.icon).catch((err) =>
            console.warn("Could not delete category icon from Cloudinary:", err)
        );
    }

    return { message: "Category deleted successfully" };
};

export const EventCategoryService = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};

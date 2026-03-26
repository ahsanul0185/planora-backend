import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { EventCategoryService } from "./eventCategory.service";

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
    const result = await EventCategoryService.getAllCategories();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Categories retrieved successfully",
        data: result,
    });
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
    const payload = {
        ...req.body,
        icon: req.file?.path ?? req.body.icon,
    };
    const result = await EventCategoryService.createCategory(payload);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Category created successfully",
        data: result,
    });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
    const payload = {
        ...req.body,
        icon: req.file?.path ?? req.body.icon,
    };
    const result = await EventCategoryService.updateCategory(req.params.id as string, payload);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Category updated successfully",
        data: result,
    });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
    await EventCategoryService.deleteCategory(req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Category deleted successfully",
    });
});

export const EventCategoryController = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};

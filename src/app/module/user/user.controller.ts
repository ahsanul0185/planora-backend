import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await UserService.createAdmin(payload);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Admin created successfully",
        data: result,
    });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result,
    });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.getUserById(id as string);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User retrieved successfully",
        data: result,
    });
});

export const UserController = {
    createAdmin,
    getAllUsers,
    getUserById
};
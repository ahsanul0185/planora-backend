import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const getOrganizerDashboardData = catchAsync(async (req: Request, res: Response) => {
    const organizerId = req.user.userId; // verify userId from jwt payload
    const result = await DashboardService.getOrganizerDashboardData(organizerId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Organizer dashboard data retrieved successfully",
        data: result,
    });
});

const getAdminDashboardData = catchAsync(async (req: Request, res: Response) => {
    const result = await DashboardService.getAdminDashboardData();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Admin dashboard data retrieved successfully",
        data: result,
    });
});

const getParticipantDashboardData = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await DashboardService.getParticipantDashboardData(userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Participant dashboard data retrieved successfully",
        data: result,
    });
});

export const DashboardController = {
    getOrganizerDashboardData,
    getAdminDashboardData,
    getParticipantDashboardData,
};

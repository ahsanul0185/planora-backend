import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { EventService } from "./event.service";

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getAllEvents(req.query as any);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Events retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getFeaturedEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getFeaturedEvent();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Featured event retrieved successfully",
        data: result,
    });
});

const getUpcomingEvents = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getUpcomingEvents();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Upcoming events retrieved successfully",
        data: result,
    });
});

const getEventById = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getEventById(req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event retrieved successfully",
        data: result,
    });
});

const getSimilarEvents = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getSimilarEvents(req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Similar events retrieved successfully",
        data: result,
    });
});

const getMyEvents = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getMyEvents(req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Your events retrieved successfully",
        data: result,
    });
});

const createEvent = catchAsync(async (req: Request, res: Response) => {
    const payload = {
        ...req.body,
        bannerImage: req.file?.path ?? req.body.bannerImage,
    };
    const result = await EventService.createEvent(payload, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Event created successfully",
        data: result,
    });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
    const payload = {
        ...req.body,
        bannerImage: req.file?.path ?? req.body.bannerImage,
    };
    const result = await EventService.updateEvent(req.params.id as string, payload, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event updated successfully",
        data: result,
    });
});

const publishEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.publishEvent(req.params.id as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event published successfully",
        data: result,
    });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.deleteEvent(req.params.id as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event deleted successfully",
        data: result,
    });
});

export const EventController = {
    getAllEvents,
    getFeaturedEvent,
    getUpcomingEvents,
    getEventById,
    getSimilarEvents,
    getMyEvents,
    createEvent,
    updateEvent,
    publishEvent,
    deleteEvent,
};

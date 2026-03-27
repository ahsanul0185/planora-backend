import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ParticipationService } from "./participation.service";

const joinPublicFreeEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.joinPublicFreeEvent(req.params.eventId as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Successfully joined the event",
        data: result,
    });
});

const requestPrivateFreeEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.requestPrivateFreeEvent(req.params.eventId as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Request to join the event submitted successfully",
        data: result,
    });
});

const joinPublicPaidEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.joinPublicPaidEvent(req.params.eventId as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment session generated successfully",
        data: result,
    });
});

const requestPrivatePaidEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.requestPrivatePaidEvent(req.params.eventId as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment session generated successfully",
        data: result,
    });
});

const getEventParticipants = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.getEventParticipants(req.params.eventId as string, req.user, req.query as any);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Participants retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const exportParticipantsAsCSV = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.exportParticipantsAsCSV(req.params.eventId as string, req.user);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=participants_${req.params.eventId}.csv`);
    
    // Express send string as response
    res.status(status.OK).send(result);
});

const updateParticipationStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.updateParticipationStatus(
        req.params.eventId as string,
        req.params.userId as string,
        req.body.status,
        req.user
    );
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Participant status updated to ${req.body.status}`,
        data: result,
    });
});

const cancelParticipation = catchAsync(async (req: Request, res: Response) => {
    const result = await ParticipationService.cancelParticipation(req.params.eventId as string, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Participation cancelled successfully",
        data: result,
    });
});

export const ParticipationController = {
    joinPublicFreeEvent,
    requestPrivateFreeEvent,
    joinPublicPaidEvent,
    requestPrivatePaidEvent,
    getEventParticipants,
    exportParticipantsAsCSV,
    updateParticipationStatus,
    cancelParticipation,
};

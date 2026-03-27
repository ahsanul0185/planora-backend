import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { InvitationService } from "./invitation.service";

const sendInvitations = catchAsync(async (req: Request, res: Response) => {
    const { eventId, emails } = req.body;
    const result = await InvitationService.sendInvitations(eventId, emails, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: result.message,
        data: result
    });
});

const getEventInvitations = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const result = await InvitationService.getEventInvitations(eventId, req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event invitations retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

const getMyInvitations = catchAsync(async (req: Request, res: Response) => {
    const result = await InvitationService.getMyInvitations(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My invitations retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

const revokeInvitation = catchAsync(async (req: Request, res: Response) => {
    const invId = req.params.invId as string;
    const result = await InvitationService.revokeInvitation(invId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invitation revoked successfully",
        data: result
    });
});

const declineInvitation = catchAsync(async (req: Request, res: Response) => {
    const invId = req.params.invId as string;
    const result = await InvitationService.declineInvitation(invId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invitation declined successfully",
        data: result
    });
});

const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
    const invId = req.params.invId as string;
    const result = await InvitationService.acceptInvitation(invId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invitation accepted successfully",
        data: result
    });
});

const payAndAcceptInvitation = catchAsync(async (req: Request, res: Response) => {
    const invId = req.params.invId as string;
    const result = await InvitationService.payAndAcceptInvitation(invId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment initiated for invitation",
        data: result
    });
});

export const InvitationController = {
    sendInvitations,
    getEventInvitations,
    getMyInvitations,
    revokeInvitation,
    declineInvitation,
    acceptInvitation,
    payAndAcceptInvitation
};

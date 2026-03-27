import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const { rating, body } = req.body;
    const result = await ReviewService.createReview(eventId, rating, body, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Review submitted successfully",
        data: result
    });
});

const getEventReviews = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const result = await ReviewService.getEventReviews(eventId, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Reviews retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const { rating, body } = req.body;
    const result = await ReviewService.updateReview(reviewId, rating, body, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review updated successfully",
        data: result
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const result = await ReviewService.deleteReview(reviewId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review deleted successfully",
        data: result
    });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getMyReviews(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Written reviews retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

export const ReviewController = {
    createReview,
    getEventReviews,
    updateReview,
    deleteReview,
    getMyReviews
};
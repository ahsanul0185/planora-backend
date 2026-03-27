import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { BookmarkService } from "./bookmark.service";

const createBookmark = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const result = await BookmarkService.createBookmark(eventId, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Event bookmarked successfully",
        data: result
    });
});

const deleteBookmark = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const result = await BookmarkService.deleteBookmark(eventId, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Bookmark removed successfully",
        data: result
    });
});

const getMyBookmarks = catchAsync(async (req: Request, res: Response) => {
    const result = await BookmarkService.getMyBookmarks(req.user, req.query);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Bookmarks retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

export const BookmarkController = {
    createBookmark,
    deleteBookmark,
    getMyBookmarks
};

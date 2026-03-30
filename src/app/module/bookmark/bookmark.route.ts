import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { BookmarkController } from "./bookmark.controller";

const router = Router();

// Dashboard - my bookmarked events
router.get("/me",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    BookmarkController.getMyBookmarks);

// Save event to bookmarks
router.post("/events/:id",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    BookmarkController.createBookmark);

// Remove event from bookmarks
router.delete("/events/:id",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    BookmarkController.deleteBookmark);

export const BookmarkRoutes = router;

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

// Dashboard - my written reviews
router.get("/me",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    ReviewController.getMyReviews);

// Admin - all reviews across the platform
router.get("/admin",
    checkAuth(Role.ADMIN),
    ReviewController.getAllReviews);

// All reviews for an event with average rating (public)
router.get("/events/:id",
    ReviewController.getEventReviews);

// Write review (only confirmed attendees, post-event)
router.post("/events/:id",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    validateRequest(ReviewValidation.createReviewZodSchema),
    ReviewController.createReview);

// Edit own review (within 7-day editDeadline)
router.patch("/:reviewId",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    validateRequest(ReviewValidation.updateReviewZodSchema),
    ReviewController.updateReview);

// Delete own review (within 7-day editDeadline)
router.delete("/:reviewId",
    checkAuth(Role.PARTICIPANT, Role.ADMIN),
    ReviewController.deleteReview);

export const ReviewRoutes = router;
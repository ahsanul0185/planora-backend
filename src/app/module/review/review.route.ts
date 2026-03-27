import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

// Dashboard - my written reviews
router.get("/me",
    checkAuth(Role.USER, Role.ADMIN),
    ReviewController.getMyReviews);

// All reviews for an event with average rating (public)
router.get("/events/:id",
    ReviewController.getEventReviews);

// Write review (only confirmed attendees, post-event)
router.post("/events/:id",
    checkAuth(Role.USER, Role.ADMIN),
    validateRequest(ReviewValidation.createReviewZodSchema),
    ReviewController.createReview);

// Edit own review (within 7-day editDeadline)
router.patch("/:reviewId",
    checkAuth(Role.USER, Role.ADMIN),
    validateRequest(ReviewValidation.updateReviewZodSchema),
    ReviewController.updateReview);

// Delete own review (within 7-day editDeadline)
router.delete("/:reviewId",
    checkAuth(Role.USER, Role.ADMIN),
    ReviewController.deleteReview);

export const ReviewRoutes = router;
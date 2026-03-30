import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { uploadBanner } from "../../config/multer.config";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { EventController } from "./event.controller";
import { createEventZodSchema, updateEventZodSchema } from "./event.validation";

const router = Router();

router.get("/featured", EventController.getFeaturedEvent);
router.get("/upcoming", EventController.getUpcomingEvents);
// router.post("/seed", EventController.seedEvents);


router.get("/me",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    EventController.getMyEvents);

router.post("/",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    uploadBanner,
    validateRequest(createEventZodSchema),
    EventController.createEvent);

router.get("/", EventController.getAllEvents);
router.get("/slug/:slug", EventController.getEventBySlug);
router.get("/:id", EventController.getEventById);
router.get("/:id/similar", EventController.getSimilarEvents);


router.put("/:id",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    uploadBanner,
    validateRequest(updateEventZodSchema),
    EventController.updateEvent);

router.patch("/:id/publish",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    EventController.publishEvent);

router.delete("/:id",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    EventController.deleteEvent);

router.patch("/:id/feature",
    checkAuth(Role.ADMIN),
    EventController.toggleFeaturedEvent);

export const EventRoutes = router;

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ParticipationController } from "./participation.controller";
import { updateStatusZodSchema } from "./participation.validation";

const router = Router();

// PARTICIPANT: Join/request/pay for events
router.post("/:eventId/join",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.joinPublicFreeEvent);

router.post("/:eventId/request",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.requestPrivateFreeEvent);

router.post("/:eventId/pay-join",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.joinPublicPaidEvent);

router.post("/:eventId/pay-request",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.requestPrivatePaidEvent);

router.post("/:eventId/pay",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.payForApprovedParticipation);

// ORGANIZER: View participants for their event
router.get("/:eventId",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    ParticipationController.getEventParticipants);

// ORGANIZER: Export participants CSV
router.get("/:eventId/export",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    ParticipationController.exportParticipantsAsCSV);

// ORGANIZER: Approve/reject/ban participants
router.put("/:eventId/users/:userId/status",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    validateRequest(updateStatusZodSchema),
    ParticipationController.updateParticipationStatus);

// PARTICIPANT: Cancel/leave an event
router.delete("/:eventId/leave",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    ParticipationController.cancelParticipation);

export const ParticipationRoutes = router;

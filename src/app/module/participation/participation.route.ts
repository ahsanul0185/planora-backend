import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ParticipationController } from "./participation.controller";
import { updateStatusZodSchema } from "./participation.validation";

const router = Router();

router.post("/:eventId/join",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.joinPublicFreeEvent);

router.post("/:eventId/request",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.requestPrivateFreeEvent);

router.post("/:eventId/pay-join",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.joinPublicPaidEvent);

router.post("/:eventId/pay-request",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.requestPrivatePaidEvent);

router.get("/:eventId",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.getEventParticipants);

router.get("/:eventId/export",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.exportParticipantsAsCSV);

router.put("/:eventId/users/:userId/status",
    checkAuth(Role.ADMIN, Role.USER),
    validateRequest(updateStatusZodSchema),
    ParticipationController.updateParticipationStatus);

router.delete("/:eventId/leave",
    checkAuth(Role.ADMIN, Role.USER),
    ParticipationController.cancelParticipation);

export const ParticipationRoutes = router;

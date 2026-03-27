import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { InvitationController } from "./invitation.controller";
import { InvitationValidation } from "./invitation.validation";

const router = Router();

router.post("/",
    checkAuth(Role.ADMIN, Role.USER),
    validateRequest(InvitationValidation.sendInvitationsZodSchema),
    InvitationController.sendInvitations);

router.get("/event/:eventId",
    checkAuth(Role.ADMIN, Role.USER),
    InvitationController.getEventInvitations);

router.delete("/:invId",
    checkAuth(Role.ADMIN, Role.USER),
    InvitationController.revokeInvitation);

router.post("/:invId/accept",
    checkAuth(Role.ADMIN, Role.USER),
    InvitationController.acceptInvitation);

router.post("/:invId/pay-accept",
    checkAuth(Role.ADMIN, Role.USER),
    InvitationController.payAndAcceptInvitation);

router.post("/:invId/decline",
    checkAuth(Role.ADMIN, Role.USER),
    InvitationController.declineInvitation);

export const InvitationRoutes = router;

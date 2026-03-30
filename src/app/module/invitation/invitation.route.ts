import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { InvitationController } from "./invitation.controller";
import { InvitationValidation } from "./invitation.validation";

const router = Router();

// ORGANIZER: Send invitations for their own events
router.post("/",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    validateRequest(InvitationValidation.sendInvitationsZodSchema),
    InvitationController.sendInvitations);

// ORGANIZER: View all invitations for an event they own
router.get("/event/:eventId",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    InvitationController.getEventInvitations);

// ORGANIZER: Revoke an invitation
router.delete("/:invId",
    checkAuth(Role.ADMIN, Role.ORGANIZER),
    InvitationController.revokeInvitation);

// PARTICIPANT: Accept invitation (free event)
router.post("/:invId/accept",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    InvitationController.acceptInvitation);

// PARTICIPANT: Pay and accept invitation (paid event)
router.post("/:invId/pay-accept",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    InvitationController.payAndAcceptInvitation);

// PARTICIPANT: Decline invitation
router.post("/:invId/decline",
    checkAuth(Role.ADMIN, Role.PARTICIPANT),
    InvitationController.declineInvitation);

export const InvitationRoutes = router;

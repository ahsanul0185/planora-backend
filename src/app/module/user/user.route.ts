import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { createAdminZodSchema, updateProfileZodSchema } from "./user.validation";
import { InvitationController } from "../invitation/invitation.controller";

const router = Router();

router.get("/",
    checkAuth(Role.ADMIN),
    UserController.getAllUsers);

router.get("/me/joined-events",
    checkAuth(Role.PARTICIPANT, Role.ORGANIZER, Role.ADMIN),
    UserController.getMyJoinedEvents);

router.get("/me/invitations",
    checkAuth(Role.PARTICIPANT, Role.ORGANIZER, Role.ADMIN),
    InvitationController.getMyInvitations);

router.patch("/update-profile",
    checkAuth(Role.PARTICIPANT, Role.ORGANIZER, Role.ADMIN),
    validateRequest(updateProfileZodSchema),
    UserController.updateMyProfile);

router.get("/:id",
    checkAuth(Role.ADMIN),
    UserController.getUserById);

router.post("/create-admin",
    checkAuth(Role.ADMIN),
    validateRequest(createAdminZodSchema),
    UserController.createAdmin);

export const UserRoutes = router;
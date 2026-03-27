import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { createAdminZodSchema } from "./user.validation";

const router = Router();

router.get("/",
    checkAuth(Role.ADMIN),
    UserController.getAllUsers);

router.get("/me/joined-events",
    checkAuth(Role.USER, Role.ADMIN),
    UserController.getMyJoinedEvents);

router.get("/:id",
    checkAuth(Role.ADMIN),
    UserController.getUserById);

router.post("/create-admin",
    checkAuth(Role.ADMIN),
    validateRequest(createAdminZodSchema),
    UserController.createAdmin);

export const UserRoutes = router;
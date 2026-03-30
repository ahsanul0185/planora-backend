import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { updateAdminZodSchema } from "./admin.validation";

const router = Router();

// ── Specific routes MUST come before /:id to avoid route shadowing ──

router.get("/",
    checkAuth(Role.ADMIN),
    AdminController.getAllAdmins);

router.patch("/change-user-status",
    checkAuth(Role.ADMIN),
    AdminController.changeUserStatus);

router.patch("/change-user-role",
    checkAuth(Role.ADMIN),
    AdminController.changeUserRole);

// ── Parameterized routes ──

router.get("/:id",
    checkAuth(Role.ADMIN),
    AdminController.getAdminById);

router.patch("/:id",
    checkAuth(Role.ADMIN),
    validateRequest(updateAdminZodSchema),
    AdminController.updateAdmin);

router.delete("/:id",
    checkAuth(Role.ADMIN),
    AdminController.deleteAdmin);

export const AdminRoutes = router;
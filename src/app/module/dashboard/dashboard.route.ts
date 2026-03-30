import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get("/organizer", checkAuth(Role.ORGANIZER), DashboardController.getOrganizerDashboardData);
router.get("/admin", checkAuth(Role.ADMIN), DashboardController.getAdminDashboardData);
router.get("/participant", checkAuth(Role.PARTICIPANT), DashboardController.getParticipantDashboardData);

export const DashboardRoutes = router;

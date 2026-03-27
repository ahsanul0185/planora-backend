import { Router } from "express";
import { AdminRoutes } from "../module/admin/admin.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { EventRoutes } from "../module/event/event.route";
import { EventCategoryRoutes } from "../module/eventCategory/eventCategory.route";
import { PaymentRoutes } from "../module/payment/payment.route";
// import { ReviewRoutes } from "../module/review/review.route";
import { UserRoutes } from "../module/user/user.route";
import { ParticipationRoutes } from "../module/participation/participation.route";
import { InvitationRoutes } from "../module/invitation/invitation.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);
router.use("/admins", AdminRoutes);
router.use("/events", EventRoutes);
router.use("/participations", ParticipationRoutes);
router.use("/categories", EventCategoryRoutes);
// router.use("/reviews", ReviewRoutes);
router.use("/payments", PaymentRoutes);
router.use("/invitations", InvitationRoutes);

export const IndexRoutes = router;
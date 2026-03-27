import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const router = Router();

// Needs raw body for Stripe webhook verification
router.post(
    "/webhook", 
    express.raw({ type: 'application/json' }), 
    PaymentController.handleStripeWebhookEvent
);

router.get(
    "/me", 
    checkAuth(Role.ADMIN, Role.USER), 
    PaymentController.getMyPayments
);

export const PaymentRoutes = router;
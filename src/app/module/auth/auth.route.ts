import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { loginUserZodSchema, registerUserZodSchema } from "./auth.validation";

const router = Router()

router.post("/register", validateRequest(registerUserZodSchema), AuthController.registerUser)
router.post("/login", validateRequest(loginUserZodSchema), AuthController.loginUser)
router.get("/me", checkAuth(Role.ADMIN, Role.PARTICIPANT, Role.ORGANIZER), AuthController.getMe)
router.post("/refresh-token", AuthController.getNewToken)
router.post("/change-password", checkAuth(Role.ADMIN, Role.PARTICIPANT, Role.ORGANIZER), AuthController.changePassword)
router.post("/logout", checkAuth(Role.ADMIN, Role.PARTICIPANT, Role.ORGANIZER), AuthController.logoutUser)
router.post("/verify-email", AuthController.verifyEmail)
router.post("/request-email-otp", AuthController.requestEmailOTP)
router.post("/forget-password", AuthController.forgetPassword)
router.post("/reset-password", AuthController.resetPassword)

router.get("/login/google", AuthController.googleLogin);
router.get("/google/success", AuthController.googleLoginSuccess);
router.get("/oauth/error", AuthController.handleOAuthError);

export const AuthRoutes = router;
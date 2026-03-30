import { Request, Response } from "express";
import status from "http-status";
import ms, { StringValue } from "ms";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CookieUtils } from "../../utils/cookie";
import { tokenUtils } from "../../utils/token";
import { AuthService } from "./auth.service";

const registerUser = catchAsync(
    async (req: Request, res: Response) => {
        const maxAge = ms(envVars.ACCESS_TOKEN_EXPIRES_IN as StringValue);
        console.log({ maxAge });
        const payload = req.body;

        console.log(payload);

        const result = await AuthService.registerUser(payload);

        const { accessToken, refreshToken, token, ...rest } = result
        
        if (accessToken) {
            tokenUtils.setAccessTokenCookie(res, accessToken);
        }
        if (refreshToken) {
            tokenUtils.setRefreshTokenCookie(res, refreshToken);
        }
        if (token) {
            tokenUtils.setBetterAuthSessionCookie(res, token as string);
        }

        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: "User registered successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,
            }
        })
    }
)

const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await AuthService.loginUser(payload);
        const { accessToken, refreshToken, token, ...rest } = result

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, token);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,

            },
        })
    }
)

const getMe = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user;
        console.log({user});
        const result = await AuthService.getMe(user);
        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User profile fetched successfully",
            data: result,
        })
    }
)

const getNewToken = catchAsync(
    async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        if (!refreshToken) {
            throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
        }
        const result = await AuthService.getNewToken(refreshToken, betterAuthSessionToken);

        const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "New tokens generated successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                sessionToken,
            },
        });
    }
)

const changePassword = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];

        const result = await AuthService.changePassword(payload, betterAuthSessionToken);

        const { accessToken, refreshToken, token } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password changed successfully",
            data: result,
        });
    }
)

const logoutUser = catchAsync(
    async (req: Request, res: Response) => {
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        const result = await AuthService.logoutUser(betterAuthSessionToken);
        CookieUtils.clearCookie(res, 'accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        CookieUtils.clearCookie(res, 'refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        CookieUtils.clearCookie(res, 'better-auth.session_token', {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User logged out successfully",
            data: result,
        });
    }
)

const verifyEmail = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await AuthService.verifyEmail(email, otp);

        const { accessToken, refreshToken, token, user } = result as any;

        if (accessToken) {
            tokenUtils.setAccessTokenCookie(res, accessToken);
        }
        if (refreshToken) {
            tokenUtils.setRefreshTokenCookie(res, refreshToken);
        }
        if (token) {
            tokenUtils.setBetterAuthSessionCookie(res, token as string);
        }

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Email verified successfully",
            data: {
                accessToken,
                refreshToken,
                token,
                user,
            },
        });
    }
)

const requestEmailOTP = catchAsync(
    async (req: Request, res: Response) => {
        const { email } = req.body;
        await AuthService.requestEmailOTP(email);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "OTP sent successfully to email",
        });
    }
)

const forgetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email } = req.body;
        await AuthService.forgetPassword(email);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset OTP sent to email successfully",
        });
    }
)

const resetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp, newPassword } = req.body;
        await AuthService.resetPassword(email, otp, newPassword);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset successfully",
        });
    }
)

// /api/v1/auth/login/google?redirect=/profile&role=ORGANIZER
const googleLogin = catchAsync((req: Request, res: Response) => {
    const redirectPath = req.query.redirect || "/dashboard";
    const role = req.query.role as string || "PARTICIPANT";

    const encodedRedirectPath = encodeURIComponent(redirectPath as string);

    const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

    // Store chosen role in a short-lived cookie (5 min) to survive the OAuth round-trip
    res.cookie("oauth_role", role, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
        sameSite: "none",
        secure: true,
        path: "/",
    });

    res.render("googleRedirect", {
        callbackURL : callbackURL,
        betterAuthUrl : envVars.BETTER_AUTH_URL,
    })
})

const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
    const redirectPath = req.query.redirect as string || "/dashboard";

    // Read the role chosen before OAuth redirect, then clear the cookie
    const oauthRole = req.cookies["oauth_role"] as string | undefined;
    res.clearCookie("oauth_role", { path: "/" });

    // Use getSession with headers to let Better Auth handle its own cookie lookup (including prefixes if any)
    const session = await auth.api.getSession({
        headers: new Headers(req.headers as any)
    })

    if (!session || !session.user) {
        console.error("No better-auth session found during Google OAuth success callback");
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
    }

    const sessionToken = session.session.token;
    const result = await AuthService.googleLoginSuccess(session, oauthRole);

    const {accessToken, refreshToken} = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);
    // ?redirect=//profile -> /profile
    const isValidRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//");
    const finalRedirectPath = isValidRedirectPath ? redirectPath : "/dashboard";

    const callbackURL = `${envVars.FRONTEND_URL}/login/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&sessionToken=${sessionToken}&redirect=${encodeURIComponent(finalRedirectPath)}`;

    res.redirect(callbackURL);
})

const handleOAuthError = catchAsync((req: Request, res: Response) => {
    const error = req.query.error as string || "oauth_failed";
    res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`);
})

export const AuthController = {
    registerUser,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logoutUser,
    verifyEmail,
    requestEmailOTP,
    forgetPassword,
    resetPassword,
    googleLogin,
    googleLoginSuccess,
    handleOAuthError,
};
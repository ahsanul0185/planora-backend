import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP, oAuthProxy } from "better-auth/plugins";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { sendEmail } from "../utils/email";
import { prisma } from "./prisma";
// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    secret: envVars.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },

    socialProviders:{
        google:{
            clientId: envVars.GOOGLE_CLIENT_ID,
            clientSecret: envVars.GOOGLE_CLIENT_SECRET,
            // callbackUrl: envVars.GOOGLE_CALLBACK_URL,
            mapProfileToUser: ()=>{
                return {
                    role : Role.PARTICIPANT,
                    status : UserStatus.ACTIVE,
                    needPasswordChange : false,
                    emailVerified : true,
                    isDeleted : false,
                    deletedAt : null,
                }
            }
        }
    },

    emailVerification:{
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.PARTICIPANT
            },

            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE
            },

            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false
            },

            birthdate: {
                type: "date",
                required: false,
                defaultValue: null
            },

            gender: {
                type: "string",
                required: false,
                defaultValue: null
            },

            phoneNumber: {
                type: "string",
                required: false,
                defaultValue: null
            },

            address: {
                type: "string",
                required: false,
                defaultValue: null
            },

            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false
            },

            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null
            },
        }
    },

    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({email, otp, type}) {
                if(type === "email-verification"){
                  const user = await prisma.user.findUnique({
                    where : {
                        email,
                    }
                  })

                   if(!user){
                    console.error(`User with email ${email} not found. Cannot send verification OTP.`);
                    return;
                   }

                   if(user && user.role === Role.ADMIN){
                    console.log(`User with email ${email} is an admin. Skipping sending verification OTP.`);
                    return;
                   }
                  
                    if (user && !user.emailVerified){
                    try {
                        await sendEmail({
                            to : email,
                            subject : "Verify your email",
                            templateName : "otp",
                            templateData :{
                                name : user.name,
                                otp,
                            }
                        })
                        console.log(`Verification OTP sent successfully to ${email}`);
                    } catch (err) {
                        console.error(`Failed to send verification OTP to ${email}:`, err);
                    }
                  }
                }else if(type === "forget-password"){
                    const user = await prisma.user.findUnique({
                        where : {
                            email,
                        }
                    })

                    if(user){
                        try {
                            await sendEmail({
                                to : email,
                                subject : "Password Reset OTP",
                                templateName : "otp",
                                templateData :{
                                    name : user.name,
                                    otp,
                                }
                            })
                            console.log(`Password reset OTP sent successfully to ${email}`);
                        } catch (err) {
                            console.error(`Failed to send password reset OTP to ${email}:`, err);
                        }
                    }
                }
            },
            expiresIn : 2 * 60, // 2 minutes in seconds
            otpLength : 6,
        }),
        oAuthProxy()
    ],

    redirectURLs:{
        signIn : `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
    },

    trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:5000", envVars.FRONTEND_URL],

    advanced: {
        // useSecureCookies is intentionally NOT set here.
        // Setting it to true prefixes ALL cookie names with __Secure-,
        // which breaks any code that reads "better-auth.session_token" directly
        // (controller, proxy, frontend). Security is intact because every cookie
        // already has secure: true set explicitly in its attributes below.
        cookies:{
            state:{
                attributes:{
                    sameSite: "none",
                    secure: true,
                    httpOnly: true,
                    path: "/",
                }
            },
            session_token:{
                name: "better-auth.session_token",
                attributes:{
                    sameSite: "none",
                    secure: true,
                    httpOnly: true,
                    path: "/",
                }
            }
        }
    }

});
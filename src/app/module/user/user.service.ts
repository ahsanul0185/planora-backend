import status from "http-status";
import { Role } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateAdminPayload } from "./user.interface";

const createAdmin = async (payload: ICreateAdminPayload) => {
    const userExists = await prisma.user.findUnique({
        where: { email: payload.admin.email }
    });

    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const { admin, password } = payload;

    const userData = await auth.api.signUpEmail({
        body: {
            ...admin,
            password,
            role: Role.ADMIN,
            needPasswordChange: true,
        }
    });

    try {
        await prisma.user.update({
            where: { id: userData.user.id },
            data: { emailVerified: true }
        });

        const adminData = await prisma.admin.create({
            data: {
                userId: userData.user.id,
                ...admin,
            }
        });

        return adminData;
    } catch (error: any) {
        console.log("Error creating admin: ", error);
        await prisma.user.delete({
            where: { id: userData.user.id }
        });
        throw error;
    }
};

const getAllUsers = async () => {
    return await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            admin: true
        }
    });
};

const getUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            admin: true,
            organizedEvents: true,
            participations: true
        }
    });
    
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }
    return user;
};

export const UserService = {
    createAdmin,
    getAllUsers,
    getUserById
};
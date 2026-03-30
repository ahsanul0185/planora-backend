import status from "http-status";
import { Role, UserStatus } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { IChangeUserRolePayload, IChangeUserStatusPayload, IUpdateAdminPayload } from "./admin.interface";

const getAllAdmins = async () => {
    const admins = await prisma.admin.findMany({
        where: {
            isDeleted: false
        },
        include: {
            user: true,
        }
    });
    return admins;
};

const getAdminById = async (id: string) => {
    const admin = await prisma.admin.findUnique({
        where: { id },
        include: { user: true }
    }); 
    return admin;
};

const updateAdmin = async (id: string, payload: IUpdateAdminPayload) => {
    const isAdminExist = await prisma.admin.findUnique({
        where: { id }
    });

    if (!isAdminExist) {
        throw new AppError(status.NOT_FOUND, "Admin not found");
    }

    const { admin } = payload;

    const updatedAdmin = await prisma.admin.update({
        where: { id },
        data: { ...admin }
    });

    return updatedAdmin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
    const isAdminExist = await prisma.admin.findUnique({
        where: { id }
    });

    if (!isAdminExist) {
        throw new AppError(status.NOT_FOUND, "Admin not found");
    }

    if (isAdminExist.userId === user.userId) {
        throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.admin.update({
            where: { id },
            data: {
                isDeleted: true,
            },
        });

        await tx.user.update({
            where: { id: isAdminExist.userId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                status: UserStatus.DELETED
            },
        });

        await tx.session.deleteMany({
            where: { userId: isAdminExist.userId }
        });

        return await tx.admin.findUnique({ where: { id }});
    });

    return result;
};

const changeUserStatus = async (user: IRequestUser, payload: IChangeUserStatusPayload) => {
    const isAdminExists = await prisma.admin.findFirstOrThrow({
        where: { email: user.email }
    });

    const { userId, userStatus } = payload;

    if (isAdminExists.userId === userId) {
        throw new AppError(status.BAD_REQUEST, "You cannot change your own status");
    }

    await prisma.user.findUniqueOrThrow({
        where: { id: userId }
    });

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: userStatus }
    });

    return updatedUser;
};

const changeUserRole = async (user: IRequestUser, payload: IChangeUserRolePayload) => {
    const isAdminExists = await prisma.admin.findFirstOrThrow({
        where: { email: user.email }
    });

    const { userId, role } = payload;

    const userToChangeRole = await prisma.user.findUniqueOrThrow({
        where: { id: userId }
    });

    if (isAdminExists.userId === userId) {
        throw new AppError(status.BAD_REQUEST, "You cannot change your own role");
    }

    if (userToChangeRole.role === role) {
        throw new AppError(status.BAD_REQUEST, `User is already ${role}`);
    }

    const result = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { role }
        });

        if (role === Role.ADMIN) {
             await tx.admin.create({
                 data: {
                     userId: userId,
                     name: userToChangeRole.name,
                     email: userToChangeRole.email,
                 }
             });
        } else if (role === Role.PARTICIPANT || role === Role.ORGANIZER) {
             // Remove admin record when demoting from ADMIN
             await tx.admin.deleteMany({
                 where: { userId: userId }
             });
        }

        return updatedUser;
    });

    return result;
};

export const AdminService = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    changeUserStatus,
    changeUserRole,
};
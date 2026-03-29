import status from "http-status";
import { Role } from "../../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { ICreateAdminPayload, IMyJoinedEventsQueryParams, IUpdateProfilePayload } from "./user.interface";

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

const PARTICIPATION_EVENT_INCLUDE = {
    event: {
        include: {
            category: true,
            organizer: { select: { id: true, name: true, email: true, image: true } },
            tags: { select: { id: true, name: true } },
            _count: { select: { participations: true, reviews: true } },
        },
    },
};

const getMyJoinedEvents = async (userId: string, queryParams: IMyJoinedEventsQueryParams) => {
    const builder = new QueryBuilder(
        prisma.participation,
        queryParams,
        {
            searchableFields: ["event.title", "event.description"],
        }
    )
        .search()
        .where({ userId })
        .sort()
        .paginate()
        .include(PARTICIPATION_EVENT_INCLUDE as any);

    return builder.execute();
};

const updateMyProfile = async (userId: string, payload: IUpdateProfilePayload) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    // Convert birthdate to Date object if provided
    const updateData = {
        ...payload,
        birthdate: payload.birthdate ? new Date(payload.birthdate) : undefined
    };

    return await prisma.user.update({
        where: { id: userId },
        data: updateData
    });
};

export const UserService = {
    createAdmin,
    getAllUsers,
    getUserById,
    getMyJoinedEvents,
    updateMyProfile,
};
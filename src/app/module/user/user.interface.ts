import { Gender } from "../../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";

export interface ICreateAdminPayload {
    password: string;
    admin: {
        name: string;
        email: string;
        profilePhoto?: string;
        contactNumber?: string;
    }
}

export interface IUpdateProfilePayload {
    name?: string;
    image?: string;
    bio?: string;
    birthdate?: string;
    gender?: Gender;
    phoneNumber?: string;
    address?: string;
}

export interface IMyJoinedEventsQueryParams extends IQueryParams {}
import { Gender } from "../../../../generated/prisma/enums";

export interface ILoginUserPayload {
    email: string;
    password: string;
}

export interface IRegisterUserPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
    birthdate?: string;
    gender?: Gender;
    phoneNumber?: string;
    address?: string;
}

export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}
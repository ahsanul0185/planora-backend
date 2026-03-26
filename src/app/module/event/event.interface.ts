import { EventStatus, EventVisibility } from "../../../../generated/prisma/enums";

export interface ICreateEventPayload {
    title: string;
    description?: string;
    bannerImage?: string;
    visibility: EventVisibility;
    startDate: string;
    endDate: string;
    timezone: string;
    isOnline: boolean;
    venueName?: string;
    venueAddress?: string;
    onlineLink?: string;
    registrationFee?: number;
    currency?: string;
    maxParticipants?: number;
    registrationDeadline?: string;
    categoryId: string;
    tags?: string[];
    status?: EventStatus;
}

export interface IUpdateEventPayload {
    title?: string;
    description?: string;
    bannerImage?: string;
    visibility?: EventVisibility;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    isOnline?: boolean;
    venueName?: string;
    venueAddress?: string;
    onlineLink?: string;
    registrationFee?: number;
    currency?: string;
    maxParticipants?: number;
    registrationDeadline?: string;
    categoryId?: string;
    tags?: string[];
}

export interface IEventQueryParams {
    searchTerm?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    visibility?: EventVisibility;
    status?: EventStatus;
    categoryId?: string;
    isFree?: string;
    [key: string]: string | undefined;
}

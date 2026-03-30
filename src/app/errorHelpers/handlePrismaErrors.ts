import status from "http-status";
import { Prisma } from "../../generated/prisma/client";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";

const getStatusCodeFromPrismaError = (errorCode: string): number => {

    if (errorCode === "P2002") {
        return status.CONFLICT;
    }
    if (["P2025", "P2001", "P2015", "P2018"].includes(errorCode)) {
        return status.NOT_FOUND;
    }
    if (["P1000", "P6002"].includes(errorCode)) {
        return status.UNAUTHORIZED;
    }
    if (["P1010", "P6010"].includes(errorCode)) {
        return status.FORBIDDEN;
    }
    if (errorCode === "P6003") {
        return status.PAYMENT_REQUIRED;
    }
    if (["P1008", "P2004", "P6004"].includes(errorCode)) {
        return status.GATEWAY_TIMEOUT;
    }
    if (errorCode === "P5011") {
        return status.TOO_MANY_REQUESTS;
    }
    if (errorCode === "P6009") {
        return 413;
    }
    if (errorCode.startsWith("P1") || ["P2024", "P2037", "P6008"].includes(errorCode)) {
        return status.SERVICE_UNAVAILABLE;
    }
    if (errorCode.startsWith("P2")) {
        return status.BAD_REQUEST;
    }
    if (errorCode.startsWith("P3") || errorCode.startsWith("P4")) {
        return status.INTERNAL_SERVER_ERROR;
    }
    return status.INTERNAL_SERVER_ERROR;
};

export const handlePrismaClientKnownRequestError = (error: Prisma.PrismaClientKnownRequestError): TErrorResponse => {
    const statusCode = getStatusCodeFromPrismaError(error.code);
    const meta = error.meta as Record<string, unknown> | undefined;

    const modelName = meta?.modelName as string | undefined;
    const cause = meta?.cause as string | undefined;
    const target = meta?.target as string[] | string | undefined;

    let message: string;
    let errorPath: string = error.code;

    switch (error.code) {
        case "P2025":
            message = modelName
                ? `${modelName} record not found`
                : cause
                    ? cause
                    : "The requested record was not found";
            break;

        case "P2001":
            message = modelName
                ? `${modelName} record does not exist`
                : "The record searched for in the where condition does not exist";
            break;

        case "P2002": {
            const fields = Array.isArray(target) ? target.join(", ") : (target ?? "field");
            message = `A record with this ${fields} already exists`;
            errorPath = String(fields);
            break;
        }

        case "P2003": {
            const field = meta?.field_name as string | undefined;
            message = field
                ? `Foreign key constraint failed on field: ${field}`
                : "Foreign key constraint failed";
            errorPath = field ?? error.code;
            break;
        }

        case "P2011": {
            const field = meta?.constraint as string | undefined;
            message = field
                ? `${field} is required and cannot be null`
                : "A required field cannot be null";
            errorPath = field ?? error.code;
            break;
        }

        case "P2014":
            message = "The change would violate a required relation between models";
            break;

        case "P2015":
            message = "A related record could not be found";
            break;

        case "P2016":
            message = "Query interpretation error — check your query parameters";
            break;

        case "P2018":
            message = "The required connected records were not found";
            break;

        case "P2019":
            message = "Input error in the query";
            break;

        case "P2023":
            message = "Inconsistent column data — a value provided is invalid for the field type";
            break;

        case "P2024":
            message = "Database connection timed out. Please try again";
            break;

        default: {
            const cleanMessage = error.message
                .replace(/Invalid `.*?` invocation:?\s*/i, "")
                .split("\n")
                .map((l: string) => l.trim())
                .find((l: string) => l.length > 5) ?? "A database error occurred";
            message = cleanMessage;
        }
    }

    const errorSources: TErrorSources[] = [{ path: errorPath, message }];

    if (cause && error.code !== "P2025") {
        errorSources.push({ path: "cause", message: cause });
    }

    return {
        success: false,
        statusCode,
        message,
        errorSources,
    };
};

export const handlePrismaClientUnknownError = (error: Prisma.PrismaClientUnknownRequestError): TErrorResponse => {
    const cleanMessage = error.message
        .replace(/Invalid `.*?` invocation:?\s*/i, "")
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)[0] ?? "An unknown database error occurred";

    return {
        success: false,
        statusCode: status.INTERNAL_SERVER_ERROR,
        message: cleanMessage,
        errorSources: [{ path: "database", message: cleanMessage }],
    };
};

export const handlePrismaClientValidationError = (error: Prisma.PrismaClientValidationError): TErrorResponse => {
    const cleanMessage = error.message
        .replace(/Invalid `.*?` invocation:?\s*/i, "")
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

    const fieldMatch = error.message.match(/Argument `(\w+)`/i);
    const fieldName = fieldMatch ? fieldMatch[1] : "field";

    const mainMessage = cleanMessage.find(
        (l: string) => !l.includes("Argument") && !l.includes("→") && l.length > 10
    ) ?? cleanMessage[0] ?? "Invalid data provided for this operation";

    return {
        success: false,
        statusCode: status.BAD_REQUEST,
        message: "Validation failed — check the data you submitted",
        errorSources: [{ path: fieldName, message: mainMessage }],
    };
};

export const handlerPrismaClientInitializationError = (error: Prisma.PrismaClientInitializationError): TErrorResponse => {
    const statusCode = error.errorCode
        ? getStatusCodeFromPrismaError(error.errorCode)
        : status.SERVICE_UNAVAILABLE;

    const mainMessage = error.message
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)[0] ?? "Database service is unavailable";

    return {
        success: false,
        statusCode,
        message: mainMessage,
        errorSources: [{ path: error.errorCode ?? "initialization", message: mainMessage }],
    };
};

export const handlerPrismaClientRustPanicError = (): TErrorResponse => ({
    success: false,
    statusCode: status.INTERNAL_SERVER_ERROR,
    message: "A critical database engine error occurred. Please contact support.",
    errorSources: [
        {
            path: "database_engine",
            message: "The Prisma engine encountered a fatal panic. Please check server logs.",
        },
    ],
});
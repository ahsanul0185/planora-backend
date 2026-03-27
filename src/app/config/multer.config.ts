import multer, { FileFilterCallback } from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Request } from "express";
import { cloudinaryUpload } from "./cloudinary.config";

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "application/pdf",
];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Accepted types: JPG, PNG, SVG, WebP, PDF`));
    }
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinaryUpload,
    params: async (_req, file) => {
        const originalName = file.originalname;
        const extension = originalName.split(".").pop()?.toLocaleLowerCase();

        const fileNameWithoutExtension = originalName
            .split(".")
            .slice(0, -1)
            .join(".")
            .toLowerCase()
            .replace(/\s+/g, "-")
            // eslint-disable-next-line no-useless-escape
            .replace(/[^a-z0-9\-]/g, "");

        const uniqueName =
            Math.random().toString(36).substring(2) +
            "-" +
            Date.now() +
            "-" +
            fileNameWithoutExtension;

        const folder = extension === "pdf" ? "pdfs" : "images";

        return {
            folder: `planora/${folder}`,
            public_id: uniqueName,
            resource_type: "auto",
        };
    },
});

export const multerUpload = multer({ storage, fileFilter });

// Pre-configured upload helpers for specific field names
export const uploadSingle = (fieldName: string) => multerUpload.single(fieldName);
export const uploadIcon = multerUpload.single("icon");
export const uploadBanner = multerUpload.single("bannerImage");
export const uploadFile = multerUpload.single("file");
export const uploadProfilePhoto = multerUpload.single("image");
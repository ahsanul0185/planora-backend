import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { uploadIcon } from "../../config/multer.config";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { EventCategoryController } from "./eventCategory.controller";
import { createCategoryZodSchema, updateCategoryZodSchema } from "./eventCategory.validation";

const router = Router();

router.get("/", EventCategoryController.getAllCategories);

router.post("/",
    checkAuth(Role.ADMIN),
    uploadIcon,
    validateRequest(createCategoryZodSchema),
    EventCategoryController.createCategory);

router.put("/:id", 
    checkAuth(Role.ADMIN),
    uploadIcon,
    validateRequest(updateCategoryZodSchema),
    EventCategoryController.updateCategory);

router.delete("/:id",
    checkAuth(Role.ADMIN),
    EventCategoryController.deleteCategory);

export const EventCategoryRoutes = router;

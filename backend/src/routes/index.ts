import express from "express";
import postRoutes from "@/features/posts/routes";
import userRoutes from "@/features/users/routes";

const router = express.Router();

router.use("/posts", postRoutes);
router.use("/users", userRoutes);

export default router;
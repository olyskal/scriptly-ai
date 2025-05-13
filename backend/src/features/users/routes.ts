// src/features/users/routes.ts
import express, { Request, Response } from "express";
import { requireAuth } from "@/libs/authMiddleware";  // sem "s" em lib
import { getUserById } from "./userService";

const router = express.Router();

router.get(
  "/me",
  requireAuth(),
  async (req: Request & { auth: { userId: string } }, res: Response) => {
    const userId = req.auth.userId;
    const user = await getUserById(userId);
    res.json(user);
  }
);

export default router;
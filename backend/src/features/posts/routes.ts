import express, { Request, Response } from "express";
import { requireAuth } from "@clerk/express";
import { generatePost, listPosts, schedulePost } from "./postService";

const router = express.Router();

router.post(
  "/generate",
  async (req: Request & { auth: { userId: string } }, res: Response) => {
    console.log("[POST /generate] body:", req.body);
    console.log("[POST /generate] auth.userId:", req.auth.userId);

    try {
      const post = await generatePost({
        topic: req.body.topic,
        tone: req.body.tone,
        userId: req.auth.userId,
      });
      console.log("[POST /generate] generated content:", post.content);
      res.json(post);
    } catch (err) {
      console.error("[POST /generate] error:", err);
      res.status(500).json({ error: "Erro ao gerar post" });
    }
  }
);

// features/posts/routes.ts
router.get(
  "/",
  async (req: Request & { auth: { userId: string } }, res: Response) => {
    const posts = await listPosts(req.auth.userId);
    res.json(posts);
  }
);

// POST /api/posts/:id/schedule
router.post(
  "/:id/schedule",
  async (req: Request & { auth: { userId: string } }, res) => {
    const userId = req.auth.userId;
    const postId = req.params.id;
    const { publishAt } = req.body; // ISO string
    const sched = await schedulePost(postId, userId, new Date(publishAt));
    res.json(sched);
  }
);

export default router;
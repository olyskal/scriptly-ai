import { requireAuth } from "@/libs/authMiddleware";
import { generatePost } from "@/features/posts/postService";

export default requireAuth(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { topic, tone } = req.body;
  const post = await generatePost({ topic, tone, userId: req.userId });

  return res.status(200).json(post);
});
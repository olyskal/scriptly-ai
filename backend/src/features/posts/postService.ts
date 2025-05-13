import { prisma } from '@/libs/db'
import { openai } from "@/libs/aiClient";
import { buildPrompt } from "./promptFactory";
import { GeneratePostInput } from "@/types/posts";

export async function generatePost({ topic, tone, userId }: GeneratePostInput) {
  const prompt = buildPrompt(topic, tone);
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message.content || "Erro ao gerar conteúdo";

  return await prisma.post.create({
    data: { topic, tone, content, userId },
  });
}

export async function listPosts(userId: string) {
  return prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function schedulePost(
  postId: string,
  userId: string,
  publishAt: Date
) {
  return prisma.schedule.create({
    data: { postId, userId, publishAt },
  });
}
import { prisma } from '@/libs/db';
import { openai } from '@/libs/aiClient';
import { buildPrompt } from './promptFactory';
import { GeneratePostInput } from '@/types/posts';
import { checkUserQuota, recordTokenUsage } from '@/features/quota';
import { QuotaExceededError } from '@/features/quota/types';
import { ApiError } from '@/libs/errorHandler';

/**
 * Obtém o status de assinatura do usuário
 */
async function getUserSubscriptionStatus(userId: string): Promise<{ isPro: boolean }> {
  const user = await prisma.$queryRaw<Array<{ subscriptionStatus: string | null }>>`
    SELECT "subscriptionStatus"
    FROM "users"
    WHERE id = ${userId}
  `;

  if (!user || user.length === 0) {
    throw new ApiError(404, 'Usuário não encontrado');
  }

  return {
    isPro: user[0].subscriptionStatus === 'active'
  };
}

export async function generatePost({ topic, tone, userId }: GeneratePostInput) {
  try {
    // Verifica a cota antes de gerar o post
    await checkUserQuota(userId);

    // Verifica se o usuário é assinante Pro
    const { isPro } = await getUserSubscriptionStatus(userId);
    const model = isPro ? 'gpt-4' : 'gpt-3.5-turbo';

    const prompt = buildPrompt(topic, tone);
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message.content || 'Erro ao gerar conteúdo';
    
    // Cria o post no banco de dados
    const post = await prisma.post.create({
      data: { topic, tone, content, userId },
    });

    // Registra o uso de tokens
    if (response.usage) {
      await recordTokenUsage(
        userId,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
    }

    return post;
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      throw new ApiError(403, error.message);
    }
    throw error;
  }
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
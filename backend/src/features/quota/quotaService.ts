import { prisma } from '@/libs/db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { QuotaExceededError } from './types';

/**
 * Verifica se o usuário pode gerar mais posts com base em sua cota mensal
 * @throws {QuotaExceededError} Se o usuário tiver excedido sua cota mensal
 */
export async function checkUserQuota(userId: string): Promise<void> {
  // Primeiro verifica se o usuário é Pro
  const user = await prisma.$queryRaw<Array<{ subscriptionStatus: string | null }>>`
    SELECT "subscriptionStatus"
    FROM "users"
    WHERE id = ${userId}
  `;

  if (!user || user.length === 0) {
    throw new Error('Usuário não encontrado');
  }

  // Usuários Pro não têm limite
  if (user[0].subscriptionStatus === 'active') {
    return;
  }

  // Conta as gerações do mês atual para usuários free
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);
  
  try {
    const result = await prisma.$queryRaw<Array<{ count: string }>>`
      SELECT COUNT(*) as count
      FROM "TokenUsage"
      WHERE "userId" = ${userId}
      AND "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
    `;
    
    const usageCount = parseInt(result[0]?.count || '0', 10);
    const FREE_MONTHLY_QUOTA = 10; // 10 gerações grátis por mês

    if (usageCount >= FREE_MONTHLY_QUOTA) {
      throw new QuotaExceededError(
        `Limite mensal de ${FREE_MONTHLY_QUOTA} gerações atingido. Atualize para o plano Pro para continuar gerando conteúdo.`
      );
    }
  } catch (error) {
    console.error('Erro ao verificar cota do usuário:', error);
    // Em caso de erro na consulta, permite a execução para não bloquear o usuário
    // Em produção, você pode querer tratar isso de forma diferente
  }
}

/**
 * Registra o uso de tokens pelo usuário
 */
export async function recordTokenUsage(
  userId: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  const totalTokens = promptTokens + completionTokens;
  
  try {
    // Usa uma query raw para inserir o token usage
    await prisma.$executeRaw`
      INSERT INTO "TokenUsage" (id, "userId", tokens, "promptTokens", "completionTokens", "createdAt")
      VALUES (gen_random_uuid(), ${userId}, ${totalTokens}, ${promptTokens}, ${completionTokens}, NOW())
    `;
  } catch (error) {
    console.error('Erro ao registrar uso de tokens:', error);
    // Em produção, você pode querer registrar em um serviço de log
    throw error;
  }
}

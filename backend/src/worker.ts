import 'dotenv/config';
import IORedis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { prisma } from '@/libs/db';
import { generatePost } from '@/features/posts/postService';
import logger from '@/libs/logger';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker(
  'post-generation',
  async (job: Job) => {
    try {
      const { name, data } = job.data as {
        name: 'generate' | 'publish';
        data: any;
      };

      logger.info(`Processing job: ${name}`, { jobId: job.id, name });

      if (name === 'generate') {
        const { postId, topic, tone, userId } = data as {
          postId: string;
          topic: string;
          tone: string;
          userId: string;
        };

        const generatedContent = await generatePost({ topic, tone, userId });
        const content = generatedContent?.content || '';
        
        // Atualiza o conteúdo do post
        await prisma.$executeRaw`
          UPDATE "Post" 
          SET content = ${content || ''}, "updatedAt" = NOW()
          WHERE id = ${postId} AND "userId" = ${userId}
        `;

        logger.info('Post generated successfully', { postId });
      } 
      else if (name === 'publish') {
        const { postId, userId } = data as { 
          postId: string; 
          userId: string;
        };

        const existingPost = await prisma.post.findUnique({
          where: { id: postId, userId },
          select: { id: true }
        });

        if (!existingPost) {
          throw new Error('Post não encontrado ou não pertence ao usuário');
        }


        // Atualiza a data de atualização do post
        await prisma.$executeRaw`
          UPDATE "Post" 
          SET "updatedAt" = NOW()
          WHERE id = ${postId}
        `;

        logger.info('Post published successfully', { postId });
      }
    } catch (error) {
      logger.error('Error processing job', { 
        jobId: job.id, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw para que o BullMQ possa lidar com as tentativas
    }
  },
  { 
    connection: redis, 
    concurrency: 5,
    removeOnComplete: { count: 1000 }, // Mantém apenas os 1000 últimos jobs completados
    removeOnFail: { count: 5000 }, // Mantém apenas os 5000 últimos jobs que falharam
  }
);

// Log de eventos do worker
worker.on('completed', (job) => {
  logger.info(`Job completed`, { 
    jobId: job.id, 
    name: job.data?.name,
    queue: job.queueName 
  });
});

worker.on('failed', (job, error) => {
  logger.error(`Job failed`, { 
    jobId: job?.id, 
    name: job?.data?.name,
    error: error.message,
    stack: error.stack,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts,
  });
});

worker.on('error', (error) => {
  logger.error('Worker error', { 
    error: error.message,
    stack: error.stack 
  });
});

// Encerramento gracioso
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker...');
  await worker.close();
  process.exit(0);
});
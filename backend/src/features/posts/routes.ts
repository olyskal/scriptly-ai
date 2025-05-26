import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import { validateSchema } from '@/libs/validation';
import { withErrorHandler, ApiError } from '@/libs/errorHandler';
import { authMiddleware } from '@/libs/authMiddleware';
import {
  generatePost,
  listPosts,
  schedulePost,
} from '@/features/posts/postService';
import { postQueue } from '@/server/queue';


const router = express.Router();

// Generate new post draft and enqueue generation
router.post(
  '/generate',
  authMiddleware,
  withErrorHandler(async (req, res, next) => {
    const { topic, tone } = validateSchema(
      z.object({ 
        topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres'), 
        tone: z.string().min(2, 'O tom deve ter pelo menos 2 caracteres') 
      }),
      req.body
    );
    // A autenticação já foi verificada pelo middleware
    const userId = req.auth!.userId; // Safe to use ! aqui pois o middleware já validou
    const post = await generatePost({ topic, tone, userId });
    await postQueue.add('post-generation', { 
      name: 'generate', 
      data: { postId: post.id, topic, tone, userId } 
    });
    res.status(201).json(post);
  })
);

// List all posts for user
router.get(
  '/',
  authMiddleware,
  withErrorHandler(async (req, res, next) => {
    // A autenticação já foi verificada pelo middleware
    const userId = req.auth!.userId; // Safe to use ! aqui pois o middleware já validou
    const posts = await listPosts(userId);
    res.json(posts);
  })
);

// Schedule an existing post for future publication
router.post(
  '/:id/schedule',
  authMiddleware,
  withErrorHandler(async (req, res, next) => {
    const schema = z.object({ 
      publishAt: z.string()
        .datetime('Data de publicação inválida')
        .refine(
          (date) => new Date(date) > new Date(),
          'A data de publicação deve ser no futuro'
        )
    });
    const { publishAt } = validateSchema(schema, req.body);
    // A autenticação já foi verificada pelo middleware
    const userId = req.auth!.userId; // Safe to use ! aqui pois o middleware já validou
    const postId = req.params.id;
    
    await schedulePost(postId, userId, new Date(publishAt));
    const delay = new Date(publishAt).getTime() - Date.now();
    
    // A validação da data já é feita pelo zod, mas mantemos a verificação por garantia
    if (delay < 0) {
      throw new ApiError(400, 'A data de publicação deve ser no futuro');
    }
    
    await postQueue.add('post-schedule', { 
      name: 'schedule', 
      data: { postId, userId },
      delay,
    });
    
    res.json({ success: true, scheduledAt: publishAt });
  })
);

export default router;
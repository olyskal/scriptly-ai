import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { clerk } from '@/config/clerk';
import { SubscriptionController } from '@/controllers/subscription.controller';
import { withErrorHandler } from '@/libs/errorHandler';

// Tipo para o handler assíncrono
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Extendendo o tipo Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function subscriptionRoutes() {
  const router = Router();

  // Middleware de autenticação simplificado
  const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(401).json({ error: 'Token não fornecido' });
        return;
      }

      // Verifica o token usando o Clerk
      const session = await clerk.verifyToken(token);
      if (!session || !session.sub) {
        res.status(401).json({ error: 'Token inválido' });
        return;
      }

      // Adiciona o ID do usuário ao objeto de requisição
      req.userId = session.sub;
      next();
    } catch (error) {
      console.error('Erro de autenticação:', error);
      res.status(401).json({ error: 'Não autorizado' });
    }
  };

  // Cria uma sessão de checkout
  router.post(
    '/create-checkout-session',
    requireAuth,
    withErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { plan, interval } = req.body;
      
      if (!plan || !interval) {
        res.status(400).json({ error: 'Plano e intervalo são obrigatórios' });
        return next();
      }

      // Chama o controlador e passa o objeto de requisição e resposta
      await SubscriptionController.createCheckoutSession(req as any, res);
      next();
    }) as AsyncRequestHandler
  );

  // Rota para webhooks do Stripe
  router.post(
    '/webhook',
    // Middleware para processar o corpo da requisição como raw para o webhook do Stripe
    express.raw({ type: 'application/json' }),
    withErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
      await SubscriptionController.handleWebhook(req as any, res);
      next();
    }) as AsyncRequestHandler
  );

  // O webhook do Stripe está em /api/webhooks/stripe
  // e é configurado diretamente no index.ts
  
  return router;
}

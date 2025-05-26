// src/lib/authMiddleware.ts
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { clerk } from '@/config/clerk';

// Define o tipo para o objeto auth
export interface AuthUser {
  userId: string;
  sessionId?: string;
  orgId?: string;
}

// Estende o tipo Request do Express para incluir a propriedade auth
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

// Middleware do Clerk para verificação de autenticação
const requireAuth = ClerkExpressRequireAuth();

// Middleware personalizado para verificação de autenticação
export const authMiddleware = async (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
): Promise<void> => {
  try {
    // Rotas públicas que não requerem autenticação
    const publicRoutes = [
      '/webhooks/stripe',
      '/health',
      '/auth/me',
      '/users/dev-token', // Rota para obter token de desenvolvimento
    ];

    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Em ambiente de desenvolvimento, aceita token de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Verifica se é um token de desenvolvimento (formato: dev_token_<userId>)
        if (token.startsWith('dev_token_')) {
          const userId = token.replace('dev_token_', '');
          
          try {
            // Verifica se o usuário existe no Clerk
            const user = await clerk.users.getUser(userId);
            
            // Se chegou aqui, o usuário existe
            (req as any).auth = { userId: user.id };
            return next();
          } catch (error) {
            // Usuário não encontrado, continua para o fluxo normal de autenticação
            console.warn('Token de desenvolvimento inválido ou usuário não encontrado');
          }
        }
      }
    }

    // Função wrapper para o callback do middleware do Clerk
    const authCallback = (err?: Error) => {
      if (err) {
        console.error('Erro de autenticação:', err);
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      // Verifica se o usuário está autenticado
      if (!(req as any).auth?.userId) {
        res.status(401).json({ error: 'Sessão inválida' });
        return;
      }

      // Continua para a próxima rota
      next();
    };

    // Usa type assertion para evitar conflitos de tipos
    (requireAuth as any)(req, res, authCallback);
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
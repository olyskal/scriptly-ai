import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../libs/errors';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 100; // Limite de requisições por janela

export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Retorna informações de rate limit nos headers
  legacyHeaders: false, // Desativa os headers X-RateLimit-*
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(new RateLimitError('Muitas requisições. Por favor, tente novamente mais tarde.'));
  },
  keyGenerator: (req: Request) => {
    // Usa o IP do usuário como chave para o rate limit
    // Se estiver atrás de um proxy (como Nginx), use: req.headers['x-forwarded-for']
    return req.ip || 'unknown';
  }
});

// Rate limit mais restritivo para rotas de autenticação
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Apenas 10 tentativas a cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(new RateLimitError('Muitas tentativas de login. Por favor, tente novamente mais tarde.'));
  },
  keyGenerator: (req: Request) => {
    // Usa o email ou nome de usuário como chave para o rate limit de autenticação
    return req.body?.email || req.body?.username || req.ip || 'unknown';
  }
});

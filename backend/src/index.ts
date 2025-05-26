import express, { json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
// Middlewares de rate limiting
import { apiRateLimiter, authRateLimiter } from './middlewares/rateLimit.middleware';
import { setupSwagger } from './docs/swagger';
import 'dotenv/config';

// Importa o middleware de autenticação personalizado
import { authMiddleware, type AuthUser } from '@/libs/authMiddleware';

// Extensão do tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

// Rotas
import postRoutes from '@/features/posts/routes';
import userRoutes from '@/features/users/routes';
import { subscriptionRoutes } from '@/routes/subscription.routes';

// Tipos e configurações
import './types/express';

// Inicialização do Express
const app = express();

// Configurações básicas
app.set('trust proxy', 1); // Importante para rate limiting atrás de proxy

// Middleware básico
app.use(helmet());

// Importa e configura o webhook do Stripe
import stripeRouter from './features/webhooks/stripe';
import { rateLimit } from 'express-rate-limit';

// Rotas de webhook (devem vir antes do body parser)
app.use('/api/webhooks/stripe', stripeRouter);
app.use(json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware de rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por janela por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições deste IP, tente novamente mais tarde' },
  skip: () => process.env.NODE_ENV !== 'production'
});

// Aplica rate limiting global para todas as rotas API
app.use('/api', apiRateLimiter);

// Aplica rate limiting mais restritivo para rotas de autenticação
app.use(['/api/auth/signin', '/api/auth/signup'], authRateLimiter);

// Middleware de autenticação
if (process.env.NODE_ENV === 'production') {
  console.log('🔒 Modo produção: autenticação estrita ativada');
  
  // Aplica o middleware de autenticação em todas as rotas, exceto as públicas
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Rotas públicas
    if (req.path.startsWith('/webhooks/') || req.path === '/health') {
      return next();
    }
    // Usa o middleware de autenticação
    return authMiddleware(req, res, next);
  });
} else {
  // Modo desenvolvimento: autenticação flexível
  console.log('👨‍💻 Modo desenvolvimento: autenticação flexível ativada');
  console.log('   - Aceitando tokens de desenvolvimento (dev_token_*)');
  console.log('   - Use POST /api/users/dev-token para obter um token de desenvolvimento');
  
  // Aplica o middleware de autenticação em todas as rotas, exceto as públicas
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Rotas públicas
    if (req.path.startsWith('/webhooks/') || req.path === '/health' || req.path === '/api/users/dev-token') {
      return next();
    }
    
    // Tenta autenticar com o token de desenvolvimento
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer dev_token_')) {
      return authMiddleware(req, res, next);
    }
    
    // Se não tiver token, usa usuário mockado
    req.auth = {
      userId: 'user_2fR4sT9x8Y7ZvXwQ',
      sessionId: 'sess_2fR4sT9x8Y7ZvXwQ',
    };
    
    console.warn('⚠️  Usando usuário mockado. Para usar autenticação real, envie um token de desenvolvimento.');
    next();
  });
}

// Rotas da aplicação
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes()); 

// Rota de health check (sem autenticação)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Rota não encontrada
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de tratamento de erros
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);
  
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.message.includes('não autenticado') ? 401 : 500;
  const message = isProd && statusCode === 500 ? 'Erro interno do servidor' : err.message;
  
  res.status(statusCode).json({ 
    error: message,
    ...(!isProd && { stack: err.stack })
  });
});

// Configuração do Swagger
setupSwagger(app);

// Servir arquivos estáticos (se necessário)
app.use(express.static(path.join(__dirname, 'public')));

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`📚 Documentação da API disponível em http://localhost:${PORT}/api-docs`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason: Error) => {
  console.error('Rejeição não tratada:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error: Error) => {
  console.error('Exceção não capturada:', error);
  server.close(() => process.exit(1));
});

// Encerramento gracioso
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado');
  });
});
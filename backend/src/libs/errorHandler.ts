import { Request, Response, NextFunction } from 'express';
import { 
  RateLimitError, 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError 
} from './errors';

export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, string[]>;
  isOperational: boolean;

  constructor(
    statusCode: number, 
    message: string, 
    details?: Record<string, string[]>,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    // Garante que o stack trace seja capturado corretamente
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Define o nome da classe para o nome do construtor
    this.name = this.constructor.name;
  }

  // Método estático para erros de validação
  static validationError(message: string, details: Record<string, string[]>) {
    return new ApiError(400, message, details);
  }

  // Método estático para erros não autorizados
  static unauthorized(message = 'Não autorizado') {
    return new ApiError(401, message);
  }

  // Método estático para erros de permissão
  static forbidden(message = 'Acesso negado') {
    return new ApiError(403, message);
  }

  // Método estático para recursos não encontrados
  static notFound(message = 'Recurso não encontrado') {
    return new ApiError(404, message);
  }

  // Método estático para erros internos do servidor
  static internal(message = 'Erro interno do servidor') {
    return new ApiError(500, message);
  }
}

interface ErrorWithMessage extends Error {
  message: string;
  stack?: string;
  statusCode?: number;
  details?: Record<string, string[]>;
}

type RateLimitedRequest = Request & {
  rateLimit?: {
    resetTime?: number;
  };
};

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function withErrorHandler(handler: AsyncRequestHandler): AsyncRequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (err) {
      // Log do erro
      const error = err as ErrorWithMessage;
      
      console.error(`[${new Date().toISOString()}] Error:`, {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Tratamento de erros personalizados
      if (error instanceof RateLimitError) {
        const rateLimitedReq = req as RateLimitedRequest;
        const resetTime = rateLimitedReq.rateLimit?.resetTime || 0;
        const retryAfter = resetTime > 0 ? Math.ceil((resetTime - Date.now()) / 1000) : 900;
        
        res.status(429).json({ 
          error: 'Too Many Requests',
          message: error.message,
          retryAfter
        });
        return;
      }

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          details: error.details
        });
        return;
      }

      if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: 'Unauthorized', message: error.message });
        return;
      }

      if (error instanceof ForbiddenError) {
        res.status(403).json({ error: 'Forbidden', message: error.message });
        return;
      }

      if (error instanceof NotFoundError) {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      // Erro interno do servidor
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };
}
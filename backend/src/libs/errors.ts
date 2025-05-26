export class RateLimitError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429; // Too Many Requests
    
    // Garante que a stack trace seja capturada corretamente
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

export class ValidationError extends Error {
  statusCode: number;
  details: Record<string, string[]>;
  
  constructor(message: string, details: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400; // Bad Request
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;
  
  constructor(message = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}

export class ForbiddenError extends Error {
  statusCode: number;
  
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError);
    }
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  
  constructor(message = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

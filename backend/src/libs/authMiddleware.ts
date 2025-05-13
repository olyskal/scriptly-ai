// src/lib/authMiddleware.ts
import type { Request, Response, NextFunction } from "express";
import {
  clerkMiddleware,
  requireAuth,
  getAuth,
} from "@clerk/express";

// Aplicar em app.use()
export const clerkAuth = clerkMiddleware();

// Usar em rotas protegidas
export { requireAuth };

// (Opcional) Função de utilitário pra pegar dados de req.auth
export function authState(req: Request) {
  return getAuth(req);
}

// Para tipar req.auth no seu código, crie um d.ts global:
// src/types/express/index.d.ts
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
        sessionId: string;
        orgId?: string;
      };
    }
  }
}
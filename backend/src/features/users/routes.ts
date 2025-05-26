// src/features/users/routes.ts
import express, { type Request, type Response, type NextFunction } from "express";
import { authMiddleware } from "@/libs/authMiddleware";
import { getUserById } from "./userService";
import { clerk } from "@/config/clerk";

const router = express.Router();

// Rota para obter informações do usuário autenticado
router.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.auth.userId;
      const user = await getUserById(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Rota para obter um token de desenvolvimento (apenas em ambiente de desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.post(
    "/dev-token",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId } = req.body;
        
        if (!userId) {
          return res.status(400).json({ error: 'userId é obrigatório' });
        }

        // Verifica se o usuário existe
        try {
          await clerk.users.getUser(userId);
        } catch (error) {
          return res.status(404).json({ 
            error: 'Usuário não encontrado',
            hint: 'Certifique-se de que o usuário existe no Clerk'
          });
        }

        // Em desenvolvimento, retornamos um token fixo para testes
        // AVISO: Isso NÃO deve ser usado em produção!
        const devToken = 'dev_token_' + userId;
        
        res.json({ 
          token: devToken,
          message: 'Token de desenvolvimento gerado com sucesso!',
          warning: 'ESTA ROTA SÓ DEVE SER USADA EM AMBIENTE DE DESENVOLVIMENTO!',
          instructions: [
            '1. Copie o token retornado',
            '2. No Swagger UI, clique no botão "Authorize" (cadeado)',
            '3. Cole o token no formato: Bearer <token>',
            '4. Clique em Authorize',
            '5. Agora você pode fazer requisições autenticadas!',
            '\nIMPORTANTE: Em produção, use o fluxo normal de autenticação do Clerk.'
          ]
        });
      } catch (error) {
        console.error('Erro ao gerar token de desenvolvimento:', error);
        next(error);
      }
    }
  );
}

export default router;
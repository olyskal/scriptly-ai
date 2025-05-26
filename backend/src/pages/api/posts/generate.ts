import type { NextApiRequest, NextApiResponse } from 'next';
import { authMiddleware } from "@/libs/authMiddleware";
import { generatePost } from "@/features/posts/postService";

// Estende o tipo NextApiRequest para incluir a propriedade auth
declare module 'next' {
  interface NextApiRequest {
    auth?: {
      userId: string;
      sessionId?: string;
    };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { topic, tone } = req.body;
    
    if (!topic || !tone) {
      return res.status(400).json({ error: 'Tópico e tom são obrigatórios' });
    }

    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const post = await generatePost({ 
      topic, 
      tone, 
      userId: req.auth.userId 
    });

    return res.status(200).json(post);
  } catch (error) {
    console.error('Erro ao gerar post:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Aplica o middleware de autenticação
export default (req: NextApiRequest, res: NextApiResponse) => {
  return authMiddleware(req as any, res as any, () => {
    return handler(req, res);
  });
};
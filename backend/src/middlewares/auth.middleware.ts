import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/libs/db';

export async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Token de autenticação não fornecido' },
      { status: 401 }
    );
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verifica o token com o Clerk
    const decoded = await clerkClient.verifyToken(token);
    const userId = decoded.sub;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }
    
    return { userId };
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Falha na autenticação' },
      { status: 401 }
    );
  }
}

export async function requirePro(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  
  try {
    // Verificar se o usuário tem assinatura ativa
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    });
    
    if (!user || user.subscriptionStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Assinatura Pro necessária' },
        { status: 403 }
      );
    }
    
    return { userId };
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar assinatura' },
      { status: 500 }
    );
  }
}

import { stripe, STRIPE_PLANS } from '@/config/stripe';
import { prisma } from '@/libs/db';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';

type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';

type UserUpdateInput = {
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  updatedAt?: Date;
};

type StripeCheckoutSession = Stripe.Checkout.Session & {
  metadata: {
    userId: string;
  };
  subscription?: string;
};

type StripeSubscription = Stripe.Subscription & {
  metadata: {
    userId: string;
  };
  current_period_end: number;
  status: string;
};



export class SubscriptionService {
  /**
   * Verifica se o usuário tem uma assinatura ativa
   */
  static async isUserPro(userId: string): Promise<boolean> {
    // Usa uma consulta raw para evitar problemas de tipagem
    const result = await prisma.$queryRaw<Array<{
      subscriptionstatus: string | null;
      currentperiodend: Date | null;
    }>>`
      SELECT "subscriptionstatus", "currentperiodend" 
      FROM "users" 
      WHERE "id" = ${userId}
    `;

    const user = result[0];
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Mapeia o status para o tipo correto
    const status = user.subscriptionstatus as SubscriptionStatus || 'INACTIVE';
    
    return this.isSubscriptionActive({
      subscriptionStatus: status,
      currentPeriodEnd: user.currentperiodend
    });
  }

  /**
   * Verifica se uma assinatura está ativa com base nos dados do usuário
   */
  private static isSubscriptionActive(user: {
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  }): boolean {
    if (user.subscriptionStatus !== 'ACTIVE') {
      return false;
    }

    // Se tiver data de expiração, verifica se ainda não expirou
    if (user.currentPeriodEnd) {
      return new Date(user.currentPeriodEnd) > new Date();
    }

    return true;
  }

  /**
   * Obtém o status da assinatura do usuário
   */
  static async getUserSubscriptionStatus(userId: string): Promise<{
    isPro: boolean;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  }> {
    // Usa uma consulta raw para evitar problemas de tipagem
    const result = await prisma.$queryRaw<Array<{
      subscriptionstatus: string | null;
      currentperiodend: Date | null;
    }>>`
      SELECT "subscriptionstatus", "currentperiodend" 
      FROM "users" 
      WHERE "id" = ${userId}
    `;

    const user = result[0];
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Mapeia o status para o tipo correto
    const status = user.subscriptionstatus as SubscriptionStatus || 'INACTIVE';
    
    return {
      isPro: this.isSubscriptionActive({
        subscriptionStatus: status,
        currentPeriodEnd: user.currentperiodend
      }),
      status,
      currentPeriodEnd: user.currentperiodend
    };
  }
  /**
   * Cria uma sessão de checkout para assinatura
   */
  static async createCheckoutSession(userId: string, priceId: string) {
    // Primeiro, busca o email do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    
    if (!user) throw new Error('Usuário não encontrado');
    
    // Busca o stripeCustomerId usando uma consulta raw
    const result = await prisma.$queryRaw<Array<{stripecustomerid: string | null}>>`
      SELECT "stripecustomerid" FROM "users" WHERE "id" = ${userId}
    `;
    
    let customerId = result[0]?.stripecustomerid || null;
    
    // Se o usuário ainda não tem um customer no Stripe, cria um
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId
        }
      });

      customerId = customer.id;
      
      // Atualiza o usuário com o ID do cliente no Stripe
      // Atualiza o usuário com o ID do cliente no Stripe usando uma consulta raw
      await prisma.$executeRaw`
        UPDATE "users" 
        SET "stripecustomerid" = ${customerId}, "updatedat" = NOW() 
        WHERE "id" = ${userId}
      `;
    }

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined, // Usa undefined se customerId for null
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId,
      },
    });

    return session;
  }

  static async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as StripeCheckoutSession);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionChange(event.data.object as StripeSubscription);
        break;
      // Adicione mais eventos conforme necessário
    }
  }

  /**
   * Atualiza o status da assinatura para ativo após confirmação do pagamento
   */
  private static async handleCheckoutCompleted(session: StripeCheckoutSession) {
    let userId = session.metadata?.userId;
    
    if (!userId && typeof session.customer === 'string') {
      const customer = await stripe.customers.retrieve(session.customer, { expand: [] }) as Stripe.Customer;
      if ('metadata' in customer) {
        userId = customer.metadata?.userId;
      }
    }
    
    if (!userId) return;

    const data: UserUpdateInput = {
      subscriptionStatus: 'ACTIVE',
      subscriptionId: session.subscription as string,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de agora
      updatedAt: new Date()
    };

    await prisma.user.update({
      where: { id: userId },
      data: data as Prisma.UserUpdateInput
    });
  }

  /**
   * Atualiza o status da assinatura quando ocorrem mudanças
   */
  private static async handleSubscriptionChange(subscription: StripeSubscription) {
    let userId = subscription.metadata?.userId;
    
    if (!userId && typeof subscription.customer === 'string') {
      const customer = await stripe.customers.retrieve(subscription.customer, { expand: [] }) as Stripe.Customer;
      if ('metadata' in customer) {
        userId = customer.metadata?.userId;
      }
    }
    
    if (!userId) return;

    const status = this.mapStripeStatus(subscription.status);
    
    const data: UserUpdateInput = {
      subscriptionStatus: status,
      subscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000)
        : null,
      updatedAt: new Date()
    };

    await prisma.user.update({
      where: { id: userId },
      data: data as Prisma.UserUpdateInput
    });
  }

  /**
   * Mapeia o status do Stripe para o nosso enum
   */
  private static mapStripeStatus(status: string): SubscriptionStatus {
    switch (status.toLowerCase()) {
      case 'active':
      case 'trialing':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELED';
      case 'unpaid':
        return 'UNPAID';
      default:
        return 'INACTIVE';
    }
  }
}

import { Prisma } from '@prisma/client';

type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaClient {
    interface PrismaClient {
      $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T[]>;
      $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number>;
    }
  }

  // Extendendo os tipos do Prisma
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Prisma {
    // Extendendo o tipo User
    interface User {
      subscriptionStatus: SubscriptionStatus;
      currentPeriodEnd: Date | null;
      stripeCustomerId: string | null;
      subscriptionId: string | null;
    }

    // Extendendo os tipos de seleção
    interface UserSelect {
      id?: boolean;
      email?: boolean;
      subscriptionStatus?: boolean;
      currentPeriodEnd?: boolean;
      stripeCustomerId?: boolean;
      subscriptionId?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
    }

    // Extendendo os tipos de inclusão
    interface UserInclude {
      subscriptionStatus?: boolean;
      currentPeriodEnd?: boolean;
      stripeCustomerId?: boolean;
      subscriptionId?: boolean;
    }

    // Extendendo os tipos de criação
    interface UserCreateInput {
      id?: string;
      email: string;
      subscriptionStatus?: SubscriptionStatus;
      currentPeriodEnd?: Date | null;
      stripeCustomerId?: string | null;
      subscriptionId?: string | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    }

    // Extendendo os tipos de atualização
    interface UserUpdateInput {
      email?: string;
      subscriptionStatus?: SubscriptionStatus;
      currentPeriodEnd?: Date | null;
      stripeCustomerId?: string | null;
      subscriptionId?: string | null;
      updatedAt?: Date | string;
    }

    // Extendendo os tipos de atualização não verificada
    interface UserUncheckedUpdateInput {
      email?: string;
      subscriptionStatus?: SubscriptionStatus;
      currentPeriodEnd?: Date | null;
      stripeCustomerId?: string | null;
      subscriptionId?: string | null;
      updatedAt?: Date | string;
    }
  }
}

export {};

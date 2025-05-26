import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import logger from '@/libs/logger';

const prisma = new PrismaClient();

// Tipos personalizados para o webhook
interface StripeInvoice extends Omit<Stripe.Invoice, 'subscription'> {
  subscription: string | Stripe.Subscription;
}

interface StripeSubscription extends Omit<Stripe.Subscription, 'status'> {
  current_period_end: number;
  status: Stripe.Subscription.Status;
}

type StripeWebhookEvent = Stripe.Event & {
  type: string;
  data: {
    object: StripeInvoice | StripeSubscription;
  };
};

type RequestWithRawBody = Request & {
  rawBody: Buffer;
};

declare module 'http' {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
  typescript: true,
});

const router = express.Router();

// Middleware para obter o corpo bruto da requisição
const rawBodyMiddleware: RequestHandler = (req, res, next) => {
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    (req as RequestWithRawBody).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', (error) => {
    logger.error('Error reading request body:', { error });
    res.status(500).json({ error: 'Error reading request body' });
  });
};

// Handler para webhooks do Stripe
const stripeWebhookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const typedReq = req as RequestWithRawBody;
  const sig = req.headers['stripe-signature'] as string | string[] | undefined;
  
  if (!sig) {
    logger.warn('Webhook Error: No Stripe signature');
    res.status(400).json({ error: 'No Stripe signature' });
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const error = 'STRIPE_WEBHOOK_SECRET is not set';
    logger.error(error);
    res.status(500).send('Server configuration error');
    return;
  }

  let event: StripeWebhookEvent;

  try {
    event = stripe.webhooks.constructEvent(
      typedReq.rawBody,
      Array.isArray(sig) ? sig[0] : sig || '',
      process.env.STRIPE_WEBHOOK_SECRET
    ) as StripeWebhookEvent;
  } catch (err) {
    const error = `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    logger.error(error, { error: err });
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const data = event.data.object;
  const metadata = (data as any).metadata;
  const userId = metadata?.userId;

  if (!userId) {
    logger.warn('Webhook received without userId in metadata', { 
      eventType: event.type,
      eventId: event.id 
    });
    res.status(400).json({ received: false, error: 'Missing userId in metadata' });
    return;
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = data as StripeInvoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
        if (!subscriptionId) {
          logger.warn('No subscription ID found in invoice', { invoiceId: invoice.id });
          break;
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionId: subscriptionId,
            currentPeriodEnd: invoice.period_end 
              ? new Date(invoice.period_end * 1000)
              : null,
            updatedAt: new Date()
          } as any,
        });
        
        logger.info('Subscription updated (invoice.paid)', { 
          userId, 
          status: 'active',
          subscriptionId,
          invoiceId: invoice.id
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = data as StripeSubscription;
        
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            currentPeriodEnd: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000)
              : null,
            updatedAt: new Date()
          } as any,
        });
        
        logger.info('Subscription updated', { 
          userId, 
          status: subscription.status,
          subscriptionId: subscription.id
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = data as StripeSubscription;
        
        await prisma.user.update({
          where: { id: userId },
          data: { 
            subscriptionStatus: 'canceled',
            subscriptionId: null,
            currentPeriodEnd: null,
            updatedAt: new Date()
          } as any,
        });
        
        logger.info('Subscription canceled', { 
          userId, 
          subscriptionId: subscription.id 
        });
        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`, { 
          eventId: event.id 
        });
    }

    res.json({ received: true });
    return;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error processing webhook', {
      eventType: event.type,
      eventId: event.id,
      userId,
      error: errorMessage,
      stack: errorStack,
    });

    res.status(500).json({ 
      error: 'Error processing webhook',
      message: errorMessage
    });
    return;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error('Error disconnecting from Prisma:', { 
        error: disconnectError 
      });
    }
  }
};

// Aplica o middleware e o handler
router.post('/', 
  express.raw({ type: 'application/json' }),
  rawBodyMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    stripeWebhookHandler(req, res, next).catch(next);
  }
);

export default router;
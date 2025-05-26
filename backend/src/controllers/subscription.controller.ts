import { STRIPE_PLANS, stripe } from '@/config/stripe';
import { SubscriptionService } from '@/services/subscription.service';
import { Request, Response } from 'express';

export class SubscriptionController {
  static async createCheckoutSession(req: Request, res: Response) {
    try {
      const { plan, interval } = req.body;
      const userId = (req as any).userId; // Usando type assertion para acessar userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const priceId = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS]?.[interval as keyof typeof STRIPE_PLANS['pro']]?.priceId;
      
      if (!priceId) {
        return res.status(400).json({ error: 'Plano inválido' });
      }
      
      const { url } = await SubscriptionService.createCheckoutSession(userId, priceId);
      
      return res.json({ url });
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      return res.status(500).json({ error: 'Erro ao criar sessão de checkout' });
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    const payload = (req as any).rawBody || req.body;
    const sig = req.headers['stripe-signature'] as string;
    
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      await SubscriptionService.handleWebhook(event);
      return res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Erro no webhook:', error);
      return res.status(400).send('Webhook error');
    }
  }
}

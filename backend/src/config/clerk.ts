import { Clerk } from '@clerk/clerk-sdk-node';

export const clerk = Clerk({
  secretKey: process.env.CLERK_SECRET_KEY || ''
});

export const authConfig = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkJwtKey: process.env.CLERK_JWT_KEY || ''
} as const;

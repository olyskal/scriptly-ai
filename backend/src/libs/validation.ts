import { AnyZodObject, z } from 'zod';
import { ApiError } from '@/libs/errorHandler';

export function validateSchema<T extends AnyZodObject>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new ApiError(400, `Invalid request body: ${message}`);
  }
  return result.data;
}
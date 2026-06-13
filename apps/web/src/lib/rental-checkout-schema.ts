import { z } from 'zod';

export const checkoutInputSchema = z.object({
  intent: z.enum(['unlist', 'close']).default('unlist'),
  rentedToUserId: z.string().nullable(),
  rentalEndDate: z.string().date().nullable(),
  updateListingEndDate: z.boolean().default(true),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

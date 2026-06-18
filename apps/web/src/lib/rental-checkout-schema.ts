import { z } from 'zod';

export const checkoutInputSchema = z.object({
  intent: z.enum(['unlist', 'close']).default('unlist'),
  rentedToUserId: z.string().nullable(),
  rentalEndDate: z.string().date().nullable(),
  updateListingEndDate: z.boolean().default(true),
  // Beta: optionally send a polite decline to everyone else who messaged.
  rejectOthers: z.boolean().default(false),
  rejectMessage: z.string().trim().max(2000).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

import { z } from 'zod';

export const DEFAULT_REJECTION_MESSAGE =
  'Thank you so much for your interest and for taking the time to reach out. ' +
  'Unfortunately the place has now been promised to someone else, so I have to ' +
  'pass for now. Wishing you all the best with your search! 🙏';

const signatureName = z
  .string()
  .trim()
  .min(2, 'Please type your full name to sign')
  .max(120, 'Name is too long');

export const proposeAgreementSchema = z.object({
  title: z.string().trim().min(3, 'Add a short title').max(160),
  monthlyRent: z.number().int().min(0).max(1_000_000),
  deposit: z.number().int().min(0).max(10_000_000).nullable().default(null),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().default(null),
  terms: z.string().trim().max(5000).optional(),
  signatureName,
  // When the proposer is the landlord, optionally decline everyone else at once.
  rejectOthers: z.boolean().default(false),
  rejectMessage: z.string().trim().max(2000).optional(),
});

export type ProposeAgreementInput = z.infer<typeof proposeAgreementSchema>;

export const signAgreementSchema = z.object({
  action: z.literal('sign'),
  signatureName,
});

export const declineAgreementSchema = z.object({
  action: z.literal('decline'),
  reason: z.string().trim().max(2000).optional(),
});

export const withdrawAgreementSchema = z.object({
  action: z.literal('withdraw'),
});

export const agreementActionSchema = z.discriminatedUnion('action', [
  signAgreementSchema,
  declineAgreementSchema,
  withdrawAgreementSchema,
]);

export type AgreementAction = z.infer<typeof agreementActionSchema>;

export const rejectOthersSchema = z.object({
  exceptConversationId: z.string().optional(),
  message: z.string().trim().min(1).max(2000).optional(),
});

export type RejectOthersInput = z.infer<typeof rejectOthersSchema>;

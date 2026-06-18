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

/** Editable inputs for the full sublease contract document (all optional). */
export const contractConfigSchema = z.object({
  propertyAddress: z.string().trim().max(300).optional(),
  floor: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  ancillaryRooms: z.string().trim().max(300).optional(),
  operatingCostsAdvance: z.number().int().min(0).max(1_000_000).optional(),
  fixedTermReason: z.string().trim().max(500).optional(),
  keys: z
    .object({
      frontDoor: z.number().int().min(0).max(50).optional(),
      apartment: z.number().int().min(0).max(50).optional(),
      mailbox: z.number().int().min(0).max(50).optional(),
    })
    .optional(),
  bank: z
    .object({
      accountHolder: z.string().trim().max(200).optional(),
      bank: z.string().trim().max(200).optional(),
      iban: z.string().trim().max(50).optional(),
      bic: z.string().trim().max(20).optional(),
    })
    .optional(),
  houseRules: z
    .object({
      quietHoursStart: z.string().trim().max(10).optional(),
      quietHoursEnd: z.string().trim().max(10).optional(),
    })
    .optional(),
  disabledClauses: z.array(z.string().max(60)).max(50).optional(),
  placeAndDate: z.string().trim().max(200).optional(),
});

export type AgreementContractConfig = z.infer<typeof contractConfigSchema>;

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
  contract: contractConfigSchema.optional(),
  // The final, possibly hand-edited contract document the proposer reviewed.
  contractMarkdown: z.string().max(100_000).optional(),
});

export type ProposeAgreementInput = z.infer<typeof proposeAgreementSchema>;

export const contractPreviewSchema = z.object({
  title: z.string().trim().max(160).optional(),
  monthlyRent: z.number().int().min(0).max(1_000_000).default(0),
  deposit: z.number().int().min(0).max(10_000_000).nullable().default(null),
  startDate: z.string().date().optional(),
  endDate: z.string().date().nullable().default(null),
  terms: z.string().trim().max(5000).optional(),
  contract: contractConfigSchema.optional(),
});

export type ContractPreviewInput = z.infer<typeof contractPreviewSchema>;

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

import { z } from 'zod';

export const planCreateSchema = z.object({
  name: z.string().min(2).max(100),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  dataCapMb: z.number().int().positive().optional(),
  downKbps: z.number().int().positive().optional(),
  upKbps: z.number().int().positive().optional(),
});

export const voucherGenerateSchema = z.object({
  planId: z.string().uuid(),
  quantity: z.number().int().min(1).max(500),
  codeLength: z.number().int().min(6).max(24).default(10),
});

export const voucherRedeemSchema = z.object({
  code: z.string().min(6).max(24),
  mac: z.string().regex(/^[0-9A-Fa-f:]{17}$/).optional(),
});

export const deviceCreditSchema = z.object({
  amount: z.number().int().positive(),
});

export const userBootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type VoucherGenerateInput = z.infer<typeof voucherGenerateSchema>;
export type VoucherRedeemInput = z.infer<typeof voucherRedeemSchema>;
export type DeviceCreditInput = z.infer<typeof deviceCreditSchema>;
export type UserBootstrapInput = z.infer<typeof userBootstrapSchema>;

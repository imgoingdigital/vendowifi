import { z } from 'zod';

export const coinSessionCreateSchema = z.object({
  // future: user context; currently empty body
});

export const coinSessionClaimSchema = z.object({
  requestCode: z.string().min(4).max(8),
  machineId: z.string().min(2).max(32)
});

export const coinSessionDepositSchema = z.object({
  requestCode: z.string().min(4).max(8),
  amountCents: z.number().int().positive().max(1_000_000),
  planId: z.string().uuid().optional()
});

export const coinSessionCancelSchema = z.object({
  requestCode: z.string().min(4).max(8)
});

export const usageIncrementSchema = z.object({
  code: z.string().min(4),
  mb: z.number().int().positive().max(10_000) // cap huge jumps
});

export const deviceHeartbeatSchema = z.object({ /* empty – path param only */ });
export const deviceRotateKeySchema = z.object({ /* empty – path param only */ });

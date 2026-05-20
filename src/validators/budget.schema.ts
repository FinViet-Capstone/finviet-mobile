import { z } from 'zod';

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid('Vui lòng chọn danh mục'),
  monthlyLimit: z.number().positive('Hạn mức phải lớn hơn 0'),
  resetDay: z.number().int().min(1).max(28).default(1),
});

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Vui lòng đặt tên mục tiêu').max(100),
  targetAmount: z.number().positive('Số tiền mục tiêu phải lớn hơn 0'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
  fundingWalletId: z.string().uuid().optional(),
});

export const addContributionSchema = z.object({
  amount: z.number().positive('Số tiền đóng góp phải lớn hơn 0'),
  note: z.string().max(200).optional(),
});

export const createWalletSchema = z.object({
  name: z.string().min(1, 'Vui lòng đặt tên ví').max(50),
  type: z.enum(['cash', 'momo', 'bank_account']),
  initialBalance: z.number().min(0, 'Số dư không được âm'),
  isPrimary: z.boolean().default(false),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;

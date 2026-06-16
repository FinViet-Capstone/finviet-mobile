import { z } from 'zod';

export const manualEntrySchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['expense', 'income']),
  description: z.string().max(200).optional(),
  merchant: z.string().max(100).optional(),
  categoryId: z.string().uuid('Vui lòng chọn danh mục').optional(),
  walletId: z.string().uuid('Vui lòng chọn ví'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
});

export const editEntrySchema = manualEntrySchema.partial().extend({
  id: z.string().uuid(),
});

export const photoConfirmSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  merchant: z.string().max(100).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
  categoryId: z.string().uuid().optional(),
  walletId: z.string().uuid('Vui lòng chọn ví'),
});

export const walletTransferSchema = z.object({
  fromWalletId: z.string().uuid('Vui lòng chọn ví nguồn'),
  toWalletId: z.string().uuid('Vui lòng chọn ví đích'),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  description: z.string().max(200).optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((data) => data.fromWalletId !== data.toWalletId, {
  message: 'Ví nguồn và ví đích không được trùng nhau',
  path: ['toWalletId'],
});

export type ManualEntryInput = z.infer<typeof manualEntrySchema>;
export type EditEntryInput = z.infer<typeof editEntrySchema>;
export type PhotoConfirmInput = z.infer<typeof photoConfirmSchema>;
export type WalletTransferInput = z.infer<typeof walletTransferSchema>;

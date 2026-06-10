/**
 * transactionDetailData.ts — Vietnamese copy for the transaction detail/edit
 * screen (app/(tabs)/transactions/[id].tsx). Kept out of JSX per the i18n rule.
 */

export const TX_DETAIL_STRINGS = {
  titleEdit: 'Sửa giao dịch',
  titleNotFound: 'Không tìm thấy',

  notFoundTitle: 'Không tìm thấy giao dịch',
  notFoundSubtitle: 'Giao dịch này có thể đã bị xóa.',
  missingIdTitle: 'Thiếu mã giao dịch',
  missingIdSubtitle: 'Không thể tải giao dịch này. Quay lại và thử lại.',
  loadErrorTitle: 'Không tải được giao dịch',
  loadErrorSubtitle: 'Đã có lỗi xảy ra. Hãy thử lại.',

  transferBanner: 'Đây là giao dịch chuyển quỹ. Một số trường không thể chỉnh sửa.',
  linkedBanner: 'Ví liên kết — chỉ có thể chỉnh sửa danh mục.',

  income: 'Thu nhập',
  expense: 'Chi tiêu',
  transfer: 'Chuyển quỹ',

  amountLabel: 'Số tiền',
  descriptionLabel: 'Mô tả',
  descriptionPlaceholder: 'VD: Cà phê sáng',
  merchantLabel: 'Nơi bán (tùy chọn)',
  merchantPlaceholder: 'VD: Highlands Coffee',
  categoryLabel: 'Danh mục',
  categoryPlaceholder: 'Chưa phân loại — chạm để chọn',
  walletLabel: 'Ví',
  walletUnknown: 'Ví đã xóa',
  dateLabel: 'Ngày',

  save: 'Lưu thay đổi',
  delete: 'Xóa giao dịch',

  amountPositiveError: 'Số tiền phải lớn hơn 0',
  noWalletTitle: 'Chưa chọn ví',
  noWalletMsg: 'Hãy chọn ví trước khi lưu.',
  savedTitle: 'Đã lưu',
  savedMsg: 'Giao dịch đã được cập nhật.',
  saveErrorTitle: 'Lỗi',
  saveErrorMsg: 'Không cập nhật được giao dịch.',

  deleteTitle: 'Xóa giao dịch?',
  deleteMsgTransfer:
    'Đây là giao dịch chuyển quỹ. Cả hai chiều (nhận + chuyển) sẽ bị xóa.',
  deleteMsg: 'Hành động này không thể hoàn tác.',
  deletedTitle: 'Đã xóa',
  deletedMsg: 'Giao dịch đã được xóa.',
  deleteErrorMsg: 'Không xóa được giao dịch.',

  cancel: 'Hủy',
  confirmDelete: 'Xóa',
  ok: 'OK',
  pickCategory: 'Chọn danh mục',
  pickWallet: 'Chọn ví',

  // AI rule assignment
  ruleTitle: 'Tạo quy tắc tự động?',
  ruleMessage: (merchant: string, category: string) =>
    `Tự động phân loại các giao dịch từ "${merchant}" vào danh mục "${category}"?`,
  ruleConfirm: 'Tạo quy tắc',
  ruleSkip: 'Không, cảm ơn',
  ruleAppliedTitle: 'Đã tạo quy tắc',
  ruleAppliedMessage: (n: number) =>
    n > 0
      ? `Đã áp dụng cho ${n} giao dịch tương tự.`
      : 'Quy tắc sẽ được áp dụng cho các giao dịch sau này.',
} as const;

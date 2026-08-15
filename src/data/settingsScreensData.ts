export const AI_PREFERENCES_STRINGS = {
  settingsEntry: 'Trợ lý AI & quyền riêng tư',
  title: 'Trợ lý AI & quyền riêng tư',
  sections: {
    categorization: 'Phân loại giao dịch',
    experience: 'Trải nghiệm AI',
    dataScope: 'Dữ liệu AI được phép sử dụng',
  },
  categorizationHint: 'Chọn cách FinViet dùng AI để phân loại giao dịch của bạn.',
  modes: {
    off: {
      label: 'Tắt phân loại bằng AI',
      description: 'FinViet không dùng AI để gợi ý hoặc tự áp dụng danh mục.',
    },
    suggest_only: {
      label: 'Chỉ gợi ý',
      description: 'AI đề xuất danh mục để bạn xem và xác nhận.',
    },
    high_confidence_auto: {
      label: 'Tự động khi đủ tin cậy',
      description: 'AI tự áp dụng danh mục khi đạt ngưỡng tin cậy bạn chọn.',
    },
  },
  threshold: {
    label: 'Ngưỡng tin cậy',
    description: (percent: number) =>
      `Chỉ tự động phân loại khi AI có độ tin cậy từ ${percent}% trở lên.`,
    decrease: (percent: number) => `Giảm ngưỡng xuống ${percent}%`,
    increase: (percent: number) => `Tăng ngưỡng lên ${percent}%`,
  },
  experience: {
    defaultHistoryEnabled: {
      label: 'Lưu lịch sử trò chuyện mặc định',
      description: 'Các cuộc trò chuyện mới có thể dùng lại ngữ cảnh gần đây.',
    },
    weeklyReportEnabled: {
      label: 'Tạo báo cáo chi tiêu hằng tuần',
      description: 'Cho phép FinViet tự động tạo báo cáo tuần cho bạn.',
    },
    ragEnabled: {
      label: 'Dùng RAG để cá nhân hóa',
      description: 'Kết hợp dữ liệu được phép và tài liệu liên quan để trả lời sát hơn.',
    },
  },
  dataScopeHint: 'Bạn có thể tắt riêng từng nhóm dữ liệu mà trợ lý AI được phép sử dụng.',
  dataScope: {
    shareBalances: 'Số dư ví',
    shareTransactions: 'Giao dịch',
    shareBudgets: 'Ngân sách',
    shareGoals: 'Mục tiêu tiết kiệm',
    shareReports: 'Báo cáo',
  },
  loadError: 'Không thể tải cài đặt AI.',
  saveError: 'Không thể lưu cài đặt AI.',
  saving: 'Đang lưu…',
  back: 'Quay lại',
};

// Subscription screen strings (Vietnamese)
export const SUBSCRIPTION_STRINGS = {
  title: 'Gói dịch vụ',
  currentPlan: 'Gói hiện tại',
  inUse: 'Đang sử dụng',
  upgradeButton: 'Nâng cấp Premium',
  safePayment: 'Bản demo — chưa thu phí thật. Huỷ bất cứ lúc nào.',
  perMonth: '/tháng',
};

// Data export screen strings
export const DATA_EXPORT_STRINGS = {
  title: 'Xuất dữ liệu',
  description: 'Xuất lịch sử giao dịch ra file CSV.',
  chipThisMonth: 'Tháng này',
  chip3Months: '3 tháng',
  chipThisYear: 'Năm nay',
  chipCustom: 'Tuỳ chọn',
  labelFrom: 'Từ ngày',
  labelTo: 'Đến ngày',
  exportButton: 'Xuất file CSV',
  exportNote: 'File sẽ được lưu hoặc chia sẻ qua ứng dụng.',
  noData: 'Không có giao dịch nào trong khoảng thời gian đã chọn.',
  sharingUnavailable: 'Thiết bị này không hỗ trợ chia sẻ file.',
  errorTitle: 'Không thể xuất file',
  errorGeneric: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  shareDialogTitle: 'Xuất lịch sử giao dịch',
};

// Delete account screen strings
export const DELETE_ACCOUNT_STRINGS = {
  title: 'Xóa tài khoản',
  warningTitle: 'Hành động này KHÔNG THỂ hoàn tác',
  warningBody: 'Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.',
  dataLostTitle: 'Dữ liệu sẽ bị mất:',
  dataItems: [
    'Tất cả các ví và số dư',
    'Lịch sử giao dịch',
    'Cài đặt ngân sách',
    'Các mục tiêu tài chính',
  ],
  dataIcons: [
    'account_balance_wallet',
    'receipt_long',
    'pie_chart',
    'flag',
  ],
  confirmLabel: 'Để xác nhận, vui lòng nhập email của bạn:',
  confirmPlaceholder: 'email@example.com',
  deleteButton: 'Xóa tài khoản vĩnh viễn',
  cancelButton: 'Hủy',
};

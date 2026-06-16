export const ONBOARDING_STEPS = {
  income: 1,
  allocation: 2,
  categories: 3,
  wallet: 4,
  total: 4,
} as const;

export const WALLET_TYPES = [
  {
    id: 'basic',
    icon: 'account_balance_wallet',
    label: 'Ví cơ bản',
    description: 'Nhập tay',
  },
  {
    id: 'linked',
    icon: 'account_balance',
    label: 'Liên kết ngân hàng',
    description: 'Tự động',
    hasAIBadge: true,
  },
] as const;

export const CATEGORY_GROUPS = [
  {
    id: 'essential',
    name: 'Thiết yếu',
    color: 'primary',
    categories: [
      { icon: 'restaurant', label: 'Ăn uống' },
      { icon: 'home', label: 'Nhà ở' },
      { icon: 'directions_car', label: 'Đi lại' },
    ],
  },
  {
    id: 'wants',
    name: 'Mong muốn',
    color: 'secondary',
    categories: [
      { icon: 'movie', label: 'Giải trí' },
      { icon: 'shopping_bag', label: 'Mua sắm' },
    ],
  },
  {
    id: 'savings',
    name: 'Tiết kiệm',
    color: 'tertiary',
    categories: [
      { icon: 'trending_up', label: 'Đầu tư' },
      { icon: 'savings', label: 'Quỹ dự phòng' },
    ],
  },
] as const;

export const ALLOCATION_PRESETS = [
  {
    id: 'essential',
    name: 'Thiết yếu',
    description: 'Nhà ở, ăn uống...',
    icon: 'home',
    color: 'primary',
    defaultPercentage: 50,
  },
  {
    id: 'wants',
    name: 'Mong muốn',
    description: 'Giải trí, du lịch...',
    icon: 'shopping_bag',
    color: 'secondary',
    defaultPercentage: 30,
  },
  {
    id: 'savings',
    name: 'Tiết kiệm',
    description: 'Đầu tư, khẩn cấp...',
    icon: 'savings',
    color: 'tertiary',
    defaultPercentage: 20,
  },
] as const;

export const CURRENCIES = [
  {
    code: 'VND',
    name: 'Việt Nam Đồng',
    symbol: '₫',
    flag: 'VN',
  },
] as const;

export const ONBOARDING_STRINGS = {
  income: {
    title: 'Thu nhập hàng tháng của bạn là bao nhiêu?',
    subtitle: 'Giúp hệ thống tính ngân sách và chấm điểm chi tiêu chính xác hơn.',
    placeholder: '0',
    button: 'Tiếp theo',
  },
  allocation: {
    title: 'Tùy chỉnh ngân sách',
    subtitle: 'Kéo để thay đổi tỷ trọng các nhóm chi tiêu',
    defaultButton: 'Dùng mặc định 50/30/20',
    validationSuccess: 'Tổng phân bổ: 100% (Hợp lệ)',
    button: 'Tiếp theo',
  },
  categories: {
    title: 'Danh mục chi tiêu của bạn',
    subtitle: 'Hệ thống đã tạo sẵn các danh mục phổ biến. Kéo thả để điều chỉnh.',
    addCategory: 'Thêm danh mục',
    skip: 'Bỏ qua',
    button: 'Tiếp theo',
  },
  wallet: {
    title: 'Thêm ví đầu tiên của bạn',
    subtitle: 'Bạn cần ít nhất một ví để bắt đầu theo dõi giao dịch.',
    nameLabel: 'Tên ví',
    namePlaceholder: 'VD: Tiền mặt, Thẻ tín dụng...',
    balanceLabel: 'Số dư hiện tại',
    balanceHint: 'Số tiền bạn đang có trong ví này.',
    currencyLabel: 'Loại tiền tệ',
    button: 'Hoàn tất',
  },
  stepIndicator: (current: number) => `Bước ${current} của ${ONBOARDING_STEPS.total}`,
} as const;

export const formatVietnameseCurrency = (value: string): string => {
  const numeric = value.replace(/[^0-9]/g, '');
  if (!numeric) return '';
  return parseInt(numeric, 10).toLocaleString('vi-VN').replace(/,/g, '.');
};

export const parseVietnameseCurrency = (formatted: string): number => {
  const numeric = formatted.replace(/\./g, '');
  return parseInt(numeric, 10) || 0;
};

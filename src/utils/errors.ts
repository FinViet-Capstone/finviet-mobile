/**
 * getApiErrorMessage — pull a human-readable, Vietnamese message from a failed API call.
 *
 * The .NET backend's error envelope is { success, message, code, errors } (see
 * finviet-be's ExceptionHandlingMiddleware.cs). `code` is a stable, machine-readable
 * string on every BusinessRuleException (422), ExternalServiceException (502), and
 * IntegrationUnavailableException (503) — the backend's own doc comment says "FE maps
 * to VI message." `message` is English, dev-facing text, not meant for end users.
 *
 * Priority: a recognized `code` → BUSINESS_RULE_MESSAGES_VI (always wins over the raw
 * message); else the first FluentValidation field error; else `message` as a last
 * resort (better than nothing, even if it's English); else the caller's fallback.
 */

import axios from 'axios';

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]> | null;
}

const SEPAY_GENERIC_ERROR_VI = 'SePay đang gặp sự cố. Vui lòng thử lại sau.';

/**
 * Every BusinessRuleException/ExternalServiceException/IntegrationUnavailableException
 * code found in finviet-be source (grepped directly against every `new
 * BusinessRuleException(...)`-style call site, not just the markdown API reference,
 * which was missing several of these). Verified 2026-08-10.
 */
export const BUSINESS_RULE_MESSAGES_VI: Record<string, string> = {
  // ─── Profile ────────────────────────────────────────────────────────────────
  allocation_locked_use_schedule_endpoint:
    'Không thể chỉnh sửa thu nhập và phân bổ ngân sách ở đây sau khi đã hoàn tất thiết lập ban đầu — hãy dùng chức năng lên lịch thay đổi thu nhập.',

  // ─── Transactions ───────────────────────────────────────────────────────────
  linked_wallet_read_only:
    'Ví liên kết ngân hàng chỉ đọc — giao dịch được tạo tự động qua đồng bộ.',
  goal_transaction_locked: 'Không thể tạo giao dịch trực tiếp cho mục tiêu tiết kiệm bằng cách này.',
  transfer_managed: 'Giao dịch chuyển khoản chỉ có thể tạo hoặc sửa qua chức năng chuyển tiền giữa các ví.',
  category_type_mismatch: 'Danh mục không phù hợp với loại giao dịch (thu/chi).',
  insufficient_balance: 'Số dư ví không đủ để thực hiện giao dịch này.',
  synced_transaction_locked: 'Giao dịch đồng bộ từ ngân hàng không thể xóa.',
  synced_transaction_fields_locked:
    'Chỉ có thể đổi danh mục cho giao dịch từ ví liên kết ngân hàng, các trường khác không thể sửa.',
  reversal_insufficient_balance: 'Không thể xóa giao dịch vì số dư ví hiện không đủ để hoàn tác.',
  transfer_pair_invalid: 'Giao dịch chuyển khoản bị lỗi và không thể xóa.',
  transfer_wallet_missing: 'Một trong hai ví của giao dịch chuyển khoản không còn tồn tại.',
  transfer_reversal_insufficient_balance:
    'Không thể hoàn tác chuyển khoản vì số dư một trong hai ví không đủ.',
  transaction_type_invalid: 'Loại giao dịch không hợp lệ.',

  // ─── Wallets ────────────────────────────────────────────────────────────────
  last_wallet: 'Không thể xóa ví duy nhất còn lại của bạn.',
  wallet_has_transactions: 'Ví này đã có giao dịch nên không thể xóa.',
  sepay_wallet_read_only: 'Ví liên kết ngân hàng chỉ đọc và không thể dùng để chuyển khoản thủ công.',
  withdraw_source_not_sepay: 'Chỉ có thể rút tiền từ ví đã liên kết ngân hàng.',
  withdraw_target_sepay_read_only: 'Không thể chuyển tiền rút vào một ví liên kết ngân hàng khác.',

  // ─── SePay linking ──────────────────────────────────────────────────────────
  sepay_not_configured: 'Tính năng liên kết SePay chưa được cấu hình. Vui lòng thử lại sau.',
  sepay_state_invalid: 'Phiên liên kết đã hết hạn hoặc không hợp lệ. Vui lòng thử lại từ đầu.',
  sepay_relink_required: 'Kết nối ngân hàng đã hết hạn. Vui lòng liên kết lại.',
  sepay_wallet_orphaned: 'Ví liên kết này không xác định được chủ sở hữu. Vui lòng liên kết lại.',
  sepay_webhook_requires_oauth: 'Không thể bật thông báo tức thời cho liên kết bằng mã token tĩnh.',
  sepay_webhook_disabled: 'Tính năng thông báo tức thời từ SePay chưa được bật.',
  sepay_webhook_url_missing: 'Không thể đăng ký nhận thông báo tức thời từ SePay.',
  sepay_webhook_url_invalid: 'Không thể đăng ký nhận thông báo tức thời từ SePay.',
  sepay_webhook_id_missing: SEPAY_GENERIC_ERROR_VI,
  sepay_empty_user: SEPAY_GENERIC_ERROR_VI,
  sepay_empty_account: SEPAY_GENERIC_ERROR_VI,
  sepay_token_empty: SEPAY_GENERIC_ERROR_VI,
  sepay_parse_error: SEPAY_GENERIC_ERROR_VI,
  sepay_validation_error: SEPAY_GENERIC_ERROR_VI,
  sepay_not_found: SEPAY_GENERIC_ERROR_VI,
  sepay_rate_limited: 'SePay đang giới hạn số lượng yêu cầu. Vui lòng thử lại sau ít phút.',
  sepay_unauthorized: 'Kết nối SePay đã hết hạn hoặc không hợp lệ. Vui lòng liên kết lại.',
  sepay_forbidden: 'Kết nối SePay đã hết hạn hoặc không hợp lệ. Vui lòng liên kết lại.',

  // ─── Saving Goals ───────────────────────────────────────────────────────────
  goal_remaining_exceeded: 'Số tiền vượt quá số tiền còn thiếu để đạt mục tiêu.',
  goal_ledger_invalid: 'Lịch sử đóng góp của mục tiêu này không hợp lệ nên không thể xóa.',
  goal_wallet_missing: 'Ví dùng để nạp tiền cho mục tiêu này không còn tồn tại.',
  goal_ledger_reversal_insufficient_balance:
    'Không thể xóa mục tiêu vì số dư ví hiện không đủ để hoàn tác một lần rút tiền trước đó.',
  goal_funding_wallet_sepay_unsupported:
    'Chỉ có thể nạp tiền cho mục tiêu từ ví thường, không phải ví liên kết ngân hàng.',
  goal_withdraw_exceeds_saved: 'Số tiền rút vượt quá số tiền hiện có trong mục tiêu.',
  goal_withdraw_target_sepay_unsupported:
    'Chỉ có thể rút tiền mục tiêu vào ví thường, không phải ví liên kết ngân hàng.',

  // ─── Extract ────────────────────────────────────────────────────────────────
  ocr_not_configured: 'Tính năng quét hóa đơn bằng ảnh chưa khả dụng. Vui lòng nhập thủ công.',
};

/** Handles the sepay_error_{httpStatus} catch-all the backend generates for unmapped upstream failures. */
function lookupCode(code: string): string | undefined {
  return BUSINESS_RULE_MESSAGES_VI[code] ?? (code.startsWith('sepay_error_') ? SEPAY_GENERIC_ERROR_VI : undefined);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    const mapped = data?.code ? lookupCode(data.code) : undefined;
    if (mapped) return mapped;
    if (data?.message && data.message.trim()) return data.message;
    if (data?.errors) {
      const first = Object.values(data.errors)[0]?.[0];
      if (first) return first;
    }
  }
  return fallback;
}

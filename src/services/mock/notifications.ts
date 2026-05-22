import type { AppNotification } from '../../types';
import { USER_ID } from './wallets';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// 10 notifications of all four types: budget_alert, weekly_report,
// goal_milestone, announcement. Mixed read/unread states.
// Deep links use Expo Router path format.
// Notifications without an actionable destination set deepLink: null explicitly
// (AppNotification.deepLink is `string | null`, not optional).

// ─── Mock Data (mutable) ──────────────────────────────────────────────────────

let NOTIFICATIONS: AppNotification[] = [
  // ── 1 · Budget alert — Mua sắm overspent ─────────────────────────────────────
  {
    id: 'notif_01',
    userId: USER_ID,
    type: 'budget_alert',
    title: 'Ngân sách Mua sắm đã vượt 80%',
    body: 'Bạn đã chi 812.000đ / 1.000.000đ ngân sách Mua sắm tháng này. Hãy kiểm tra lại chi tiêu!',
    deepLink: '/more/budget/budget_shopping_01',
    isRead: false,
    sentAt: '2026-05-13T14:30:00.000Z',
  },

  // ── 2 · Weekly report ready ───────────────────────────────────────────────────
  {
    id: 'notif_02',
    userId: USER_ID,
    type: 'weekly_report',
    title: 'Báo cáo tuần của bạn đã sẵn sàng',
    body: 'Báo cáo chi tiêu tuần 11–17/05/2026 đã được tạo. Nhấn để xem tóm tắt và gợi ý tiết kiệm.',
    deepLink: '/report/weekly',
    isRead: false,
    sentAt: '2026-05-18T06:00:00.000Z',
  },

  // ── 3 · Goal milestone — Du lịch Đà Nẵng 70% ────────────────────────────────
  {
    id: 'notif_03',
    userId: USER_ID,
    type: 'goal_milestone',
    title: 'Mục tiêu Du lịch Đà Nẵng đạt 70%!',
    body: 'Bạn đã tích lũy được 5.600.000đ / 8.000.000đ. Chỉ còn 2.400.000đ nữa là hoàn thành!',
    deepLink: '/wallet/goals/goal_danang_01',
    isRead: false,
    sentAt: '2026-05-15T10:05:00.000Z',
  },

  // ── 4 · Budget alert — Sức khỏe nearing limit ────────────────────────────────
  {
    id: 'notif_04',
    userId: USER_ID,
    type: 'budget_alert',
    title: 'Ngân sách Sức khỏe gần đạt giới hạn',
    body: 'Bạn đã dùng 77,5% ngân sách Sức khỏe (620.000đ / 800.000đ). Còn 180.000đ cho 10 ngày cuối tháng.',
    deepLink: '/more/budget/budget_health_01',
    isRead: true,
    sentAt: '2026-05-19T10:30:00.000Z',
  },

  // ── 5 · Announcement — app update (no actionable deep link) ──────────────────
  {
    id: 'notif_05',
    userId: USER_ID,
    type: 'announcement',
    title: 'FinViet v1.2 — Tính năng mới!',
    body: 'Phiên bản mới đã có: nhập liệu bằng ảnh nhanh hơn, cải thiện giao diện Lịch và sửa một số lỗi nhỏ. Cảm ơn bạn đã đồng hành!',
    deepLink: null,   // broadcast announcement — no specific screen to deep-link to
    isRead: true,
    sentAt: '2026-05-10T08:00:00.000Z',
  },

  // ── 6 · Goal milestone — Quỹ khẩn cấp 90% ───────────────────────────────────
  {
    id: 'notif_06',
    userId: USER_ID,
    type: 'goal_milestone',
    title: 'Quỹ khẩn cấp đạt 90%!',
    body: 'Tuyệt vời! Bạn gần hoàn thành mục tiêu Quỹ khẩn cấp. Chỉ còn 2.000.000đ nữa là về đích.',
    deepLink: '/wallet/goals/goal_emergency_01',
    isRead: true,
    sentAt: '2026-05-08T09:00:00.000Z',
  },

  // ── 7 · Weekly report (previous week) ────────────────────────────────────────
  {
    id: 'notif_07',
    userId: USER_ID,
    type: 'weekly_report',
    title: 'Báo cáo tuần 04–10/05 đã sẵn sàng',
    body: 'Tuần trước bạn chi 1.890.000đ, giảm 8% so với tuần trước đó. Nhấn để đọc chi tiết.',
    deepLink: '/report/weekly',
    isRead: true,
    sentAt: '2026-05-11T06:00:00.000Z',
  },

  // ── 8 · Budget alert — Mua sắm first warning (80% threshold) ─────────────────
  {
    id: 'notif_08',
    userId: USER_ID,
    type: 'budget_alert',
    title: 'Ngân sách Mua sắm đã đạt 80%',
    body: 'Bạn đã chi 800.000đ / 1.000.000đ ngân sách Mua sắm. Còn 200.000đ — hãy cẩn thận chi tiêu thêm!',
    deepLink: '/more/budget/budget_shopping_01',
    isRead: true,
    sentAt: '2026-05-09T16:30:00.000Z',
  },

  // ── 9 · Announcement — financial tip (no actionable deep link) ───────────────
  {
    id: 'notif_09',
    userId: USER_ID,
    type: 'announcement',
    title: 'Mẹo tiết kiệm tháng 5',
    body: 'Tháng 5 có nhiều dịp mua sắm online. Hãy đặt ngân sách trước khi mở app mua hàng để tránh chi tiêu bốc đồng. FinViet có thể giúp bạn theo dõi ngân sách theo thời gian thực!',
    deepLink: null,   // tip announcement — no specific screen to deep-link to
    isRead: true,
    sentAt: '2026-05-05T07:00:00.000Z',
  },

  // ── 10 · Goal milestone — iPhone first contribution ───────────────────────────
  {
    id: 'notif_10',
    userId: USER_ID,
    type: 'goal_milestone',
    title: 'Đã đóng góp vào mục tiêu iPhone!',
    body: 'Bạn vừa thêm 500.000đ vào mục tiêu "Mua iPhone 16 Pro Max". Tiến độ: 35,7%. Cố lên!',
    deepLink: '/wallet/goals/goal_iphone_01',
    isRead: true,
    sentAt: '2026-05-01T11:00:00.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

const delay = (ms = 200) => new Promise<void>((r) => setTimeout(r, ms));

/** Returns all notifications sorted newest-first. */
export function getNotifications(): AppNotification[] {
  return [...NOTIFICATIONS].sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt),
  );
}

/** Returns only unread notifications. */
export function getUnreadNotifications(): AppNotification[] {
  return getNotifications().filter((n) => !n.isRead);
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay();
  NOTIFICATIONS = NOTIFICATIONS.map((n) =>
    n.id === id ? { ...n, isRead: true } : n,
  );
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  await delay();
  const count = NOTIFICATIONS.filter((n) => !n.isRead).length;
  NOTIFICATIONS = NOTIFICATIONS.map((n) =>
    n.isRead ? n : { ...n, isRead: true },
  );
  return { count };
}

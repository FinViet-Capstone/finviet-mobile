import type { SpendingScore, WeeklyReport, ChatMessage, ChatSession } from '../../types';
import { USER_ID } from './wallets';

// ─── Mock Data — Spending Score ────────────────────────────────────────────────
// Week of 18–24 May 2026. Score = 72 → green (≥70).

const MOCK_SPENDING_SCORE_WEEKLY: SpendingScore = {
  id: 'score_2026w21_01',
  userId: USER_ID,
  view: 'weekly',
  score: 72,
  color: 'green',
  verdictVi: 'Tốt',
  reasonVi: 'Chi tiêu ổn định, có tiết kiệm đều đặn trong tuần.',
  commentaryVi:
    'Tuần này bạn đã chi tiêu khá hợp lý với tổng chi phí sinh hoạt ở mức kiểm soát được. ' +
    'Điểm mạnh là bạn đã thực hiện đúng khoản tiết kiệm cố định 1.000.000đ và chi phí ăn uống ' +
    'không vượt mức trung bình. Tuy nhiên, danh mục Mua sắm tiếp tục là điểm yếu — tháng này ' +
    'bạn đã vượt ngân sách mua sắm tới 150%, chủ yếu đến từ Shopee và Uniqlo. Nếu bạn có thể ' +
    'kiềm chế chi tiêu mua sắm trong 10 ngày còn lại của tháng 5, điểm số của bạn có thể đạt ' +
    'mức 80–85 vào tuần tới.',
  weekStart: '2026-05-18',
  generatedAt: '2026-05-18T06:00:00.000Z',
};

// Month of May 2026. Score = 54 → amber (40–69).
const MOCK_SPENDING_SCORE_MONTHLY: SpendingScore = {
  id: 'score_2026m05_01',
  userId: USER_ID,
  view: 'monthly',
  score: 54,
  color: 'amber',
  verdictVi: 'Trung bình',
  reasonVi: 'Tiết kiệm đạt mục tiêu nhưng mua sắm vượt ngân sách.',
  commentaryVi:
    'Tháng 5/2026, điểm của bạn đạt 54 — mức trung bình. Điểm tiết kiệm khá tốt (68/100) nhờ ' +
    'bạn duy trì đều đặn khoản tiết kiệm cố định 1.000.000đ/tháng. Tuy nhiên điểm tuân thủ ngân sách ' +
    'chỉ đạt 44/100 do danh mục Mua sắm vượt 150% và tổng chi đang ở mức 91,7% thu nhập. ' +
    'Điểm biến động chi tiêu ở mức 51/100 — có một số ngày chi đột biến (Shopee, Uniqlo). ' +
    'Để cải thiện tháng tới, hãy đặt giới hạn cứng cho Mua sắm và kích hoạt thông báo khi đạt 80%.',
  weekStart: '2026-05-01',
  generatedAt: '2026-06-01T06:00:00.000Z',
};

// ─── Mock Data — Weekly Report ─────────────────────────────────────────────────
// Report covers week 11–17 May 2026, generated on Monday 18 May.
// Vietnamese narrative — approximately 170 words.

const MOCK_WEEKLY_REPORT: WeeklyReport = {
  id: 'report_2026w20_01',
  userId: USER_ID,
  reportTextVi:
    'Tuần vừa qua (11–17/05/2026), tổng chi tiêu của bạn đạt 2.154.000đ, tăng nhẹ so với ' +
    'tuần trước (1.890.000đ). Danh mục tốn nhiều nhất là Mua sắm với 628.000đ, đến từ Uniqlo ' +
    '(450.000đ) và Tiki (178.000đ), chiếm gần 29% tổng chi trong tuần. Ăn uống xếp thứ hai với ' +
    '352.000đ — mức khá ổn định và phù hợp với ngân sách tháng bạn đặt ra. Chi phí di chuyển ' +
    'tiếp tục ở mức thấp, chỉ 77.000đ, cho thấy bạn đã tối ưu tốt việc đi lại trong tuần.\n\n' +
    'Điểm cần lưu ý: danh mục Mua sắm đã vượt ngân sách tháng (1.000.000đ) chỉ sau 17 ngày. ' +
    'Nếu tiếp tục đà này, cuối tháng bạn có thể vượt giới hạn tới 50%. Ngoài ra, có 3 giao ' +
    'dịch chưa được phân loại — bạn nên vào mục Lịch để bổ sung danh mục cho các khoản này.\n\n' +
    'Gợi ý tiết kiệm tháng 5: Trong 2 tuần còn lại, hãy đặt mục tiêu không mua sắm thêm và ' +
    'dành phần ngân sách dư đó bổ sung vào mục tiêu "Du lịch Đà Nẵng" — bạn chỉ còn thiếu ' +
    '2.400.000đ để hoàn thành mục tiêu này trước kỳ nghỉ hè!',
  weekStart: '2026-05-11',
  generatedAt: '2026-05-18T06:00:00.000Z',
  isRead: false,
};

// ─── Mock Data — Chat History ──────────────────────────────────────────────────
// A realistic 3-turn conversation between user and AI Advisor.

const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    id: 'msg_01',
    userId: USER_ID,
    role: 'user',
    content: 'Tháng này tôi tiêu nhiều nhất vào đâu?',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:00:00.000Z',
  },
  {
    id: 'msg_02',
    userId: USER_ID,
    role: 'assistant',
    content:
      'Tháng 5/2026 (tính đến hôm nay 21/05), bạn chi nhiều nhất vào danh mục **Mua sắm** ' +
      'với tổng 1.508.000đ — vượt ngân sách 1.000.000đ bạn đã đặt ra. Các khoản lớn nhất gồm: ' +
      'Shopee (quần áo) 560.000đ, Uniqlo 450.000đ, và Shopee (đồ gia dụng) 320.000đ. ' +
      'Đứng thứ hai là Nhà ở với 3.500.000đ tiền thuê phòng — tuy nhiên đây là chi phí cố định ' +
      'nên không đáng lo ngại. Trong các danh mục chi tiêu biến đổi, Ăn uống (812.000đ) đang ở ' +
      'mức hợp lý, chỉ chiếm 40,6% ngân sách bạn đặt ra.',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:00:05.000Z',
  },
  {
    id: 'msg_03',
    userId: USER_ID,
    role: 'user',
    content: 'Tôi cần tiết kiệm thêm bao nhiêu để đạt mục tiêu du lịch Đà Nẵng?',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:01:00.000Z',
  },
  {
    id: 'msg_04',
    userId: USER_ID,
    role: 'assistant',
    content:
      'Mục tiêu "Du lịch Đà Nẵng hè 2026" của bạn hiện ở mức **70%** — bạn đã tích lũy được ' +
      '5.600.000đ trên tổng 8.000.000đ cần thiết. Còn thiếu **2.400.000đ** và deadline là ' +
      '15/07/2026 — tức còn khoảng 55 ngày. Để về đích đúng hạn, bạn cần tiết kiệm thêm khoảng ' +
      '1.200.000đ/tháng. Gợi ý thực tế: nếu bạn hạn chế mua sắm không cần thiết trong tháng ' +
      '5–6, phần ngân sách tiết kiệm được hoàn toàn đủ để bổ sung vào mục tiêu này mà không ' +
      'ảnh hưởng tới sinh hoạt phí hàng ngày.',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:01:08.000Z',
  },
  {
    id: 'msg_05',
    userId: USER_ID,
    role: 'user',
    content: 'So sánh chi tiêu tháng này với tháng trước?',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:02:00.000Z',
  },
  {
    id: 'msg_06',
    userId: USER_ID,
    role: 'assistant',
    content:
      'Tháng 4/2026 bạn chi tổng **7.820.000đ** (đã trừ chuyển khoản nội bộ). Tháng 5/2026 ' +
      'tính đến ngày 21/05 bạn đã chi **8.315.000đ** — tức là chỉ còn 10 ngày nữa mà đã vượt ' +
      'cả tháng trước. Mức tăng rõ ràng nhất đến từ danh mục Mua sắm (+960.000đ so với tháng 4) ' +
      'và Sức khỏe (+370.000đ, do lần khám định kỳ tại Bệnh viện FV). Ăn uống và Di chuyển khá ' +
      'ổn định. Nếu duy trì đà chi tiêu hiện tại, tháng 5 bạn có thể kết thúc ở mức ~11.000.000đ, ' +
      'tương đương 91,7% thu nhập tháng — không còn nhiều dư địa để tiết kiệm.',
    sessionId: 'session_demo_01',
    createdAt: '2026-05-21T09:02:10.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

export function getSpendingScore(view: 'weekly' | 'monthly' = 'weekly'): SpendingScore {
  return view === 'monthly' ? MOCK_SPENDING_SCORE_MONTHLY : MOCK_SPENDING_SCORE_WEEKLY;
}

export function getWeeklyReport(): WeeklyReport {
  return MOCK_WEEKLY_REPORT;
}

export function getChatHistory(): ChatMessage[] {
  return MOCK_CHAT_HISTORY;
}

// ─── Mock Data — Chat Sessions ─────────────────────────────────────────────────

const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    sessionId: 'session_demo_01',
    userId: USER_ID,
    previewText: 'Tháng này tôi tiêu nhiều nhất vào đâu?',
    lastMessageAt: '2026-05-21T09:02:10.000Z',
    messageCount: 6,
  },
  {
    sessionId: 'session_demo_02',
    userId: USER_ID,
    previewText: 'Tôi có đang chi tiêu quá mức không?',
    lastMessageAt: '2026-05-15T14:30:00.000Z',
    messageCount: 4,
  },
  {
    sessionId: 'session_demo_03',
    userId: USER_ID,
    previewText: 'Gợi ý cách tiết kiệm cho tháng tới?',
    lastMessageAt: '2026-05-10T10:00:00.000Z',
    messageCount: 3,
  },
];

const MOCK_SESSION_02: ChatMessage[] = [
  {
    id: 'msg_s2_01', userId: USER_ID, role: 'user',
    content: 'Tôi có đang chi tiêu quá mức không?',
    sessionId: 'session_demo_02', createdAt: '2026-05-15T14:30:00.000Z',
  },
  {
    id: 'msg_s2_02', userId: USER_ID, role: 'assistant',
    content: 'Tháng 5 đến ngày 15/05, bạn đã chi 6.120.000đ — tương đương 51% thu nhập. Với 16 ngày còn lại, nếu duy trì tốc độ này bạn sẽ kết thúc tháng ở mức ~12.5M, vượt thu nhập 12M. Danh mục cần chú ý nhất là Mua sắm (đã vượt ngân sách 89%).',
    sessionId: 'session_demo_02', createdAt: '2026-05-15T14:30:08.000Z',
  },
];

const MOCK_SESSION_03: ChatMessage[] = [
  {
    id: 'msg_s3_01', userId: USER_ID, role: 'user',
    content: 'Gợi ý cách tiết kiệm cho tháng tới?',
    sessionId: 'session_demo_03', createdAt: '2026-05-10T10:00:00.000Z',
  },
  {
    id: 'msg_s3_02', userId: USER_ID, role: 'assistant',
    content: 'Dựa trên chi tiêu tháng 5, tôi có 3 gợi ý: 1) Đặt giới hạn Mua sắm 700.000đ (giảm 30%), 2) Đặt 500.000đ vào tiết kiệm ngay đầu tháng, 3) Bật nhắc nhở ngân sách khi đạt 80% hạn mức.',
    sessionId: 'session_demo_03', createdAt: '2026-05-10T10:00:10.000Z',
  },
];

const SESSION_MAP: Record<string, ChatMessage[]> = {
  session_demo_01: MOCK_CHAT_HISTORY,
  session_demo_02: MOCK_SESSION_02,
  session_demo_03: MOCK_SESSION_03,
};

export function getChatSessions(): ChatSession[] {
  return MOCK_CHAT_SESSIONS;
}

export function getChatSessionMessages(sessionId: string): ChatMessage[] {
  return SESSION_MAP[sessionId] ?? [];
}

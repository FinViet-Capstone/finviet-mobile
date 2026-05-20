export type ScoreColor = 'green' | 'amber' | 'red';

export interface SpendingScore {
  id: string;
  userId: string;
  score: number; // 0–100
  color: ScoreColor;
  verdictVi: string;   // one-word verdict in Vietnamese
  reasonVi: string;    // one-line reason
  commentaryVi: string; // full paragraph for detail screen
  weekStart: string;   // ISO date — Monday of the scored week
  generatedAt: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  reportTextVi: string; // 150–200 word Vietnamese narrative
  weekStart: string;
  generatedAt: string;
  isRead: boolean;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  sessionId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'budget_alert' | 'weekly_report' | 'goal_milestone' | 'announcement';
  title: string;
  body: string;
  deepLink?: string;
  isRead: boolean;
  sentAt: string;
}

export const SUGGESTED_PROMPTS_VI = [
  'Tháng này tôi tiêu nhiều nhất vào đâu?',
  'Tôi có đang chi tiêu quá mức không?',
  'Gợi ý cách tiết kiệm cho tháng tới?',
  'Danh mục nào vượt ngân sách tuần này?',
  'So sánh chi tiêu tháng này với tháng trước',
] as const;

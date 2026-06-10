/**
 * ai.ts - FinViet type definitions for AI-generated content
 *
 * Date fields:
 *   weekStart   : "YYYY-MM-DD" (always a Monday)
 *   generatedAt / createdAt : full ISO 8601 timestamp string
 *
 * All AI-generated text fields (verdictVi, reasonVi, commentaryVi, reportTextVi)
 * are in Vietnamese as specified in the SPEC.
 */

// -------------------------------------------------------------------------
// Spending Score
// -------------------------------------------------------------------------

/** Visual color band for the spending score ring badge */
export type ScoreColor = 'green' | 'amber' | 'red';

export interface SpendingScore {
  id: string;
  userId: string;
  /** Which formula was used */
  view: 'weekly' | 'monthly';
  /** Integer 0-100 */
  score: number;
  /** green >= 70 | amber 40-69 | red < 40 */
  color: ScoreColor;
  /** One-word verdict in Vietnamese */
  verdictVi: string;
  /** One-line explanation in Vietnamese */
  reasonVi: string;
  /** Full paragraph AI commentary for the score detail screen */
  commentaryVi: string;
  /** ISO 8601 date "YYYY-MM-DD" -- always the Monday of the scored week */
  weekStart: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
}

// -------------------------------------------------------------------------
// Weekly Report
// -------------------------------------------------------------------------

export interface WeeklyReport {
  id: string;
  userId: string;
  /** 150-200 word Vietnamese narrative of last week's spending */
  reportTextVi: string;
  /** ISO 8601 date "YYYY-MM-DD" -- Monday of the reported week */
  weekStart: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
  isRead: boolean;
}

// -------------------------------------------------------------------------
// AI Advisor Chat
// -------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  /** Groups messages belonging to the same conversation session */
  sessionId: string;
  /** ISO 8601 timestamp */
  createdAt: string;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  /** Preview of the first user message */
  previewText: string;
  /** ISO 8601 timestamp of most recent message */
  lastMessageAt: string;
  /** Total message count in the session */
  messageCount: number;
}

// -------------------------------------------------------------------------
// Suggested prompt chips shown when the AI Advisor opens (SPEC requirement)
// -------------------------------------------------------------------------

export const SUGGESTED_PROMPTS_VI = [
  'Tháng này tôi tiêu nhiều nhất vào đâu?',
  'Tôi có đang chi tiêu quá mức không?',
  'Gợi ý cách tiết kiệm cho tháng tới?',
  'Danh mục nào vượt ngân sách tuần này?',
  'So sánh chi tiêu tháng này với tháng trước',
] as const;

export type SuggestedPrompt = (typeof SUGGESTED_PROMPTS_VI)[number];

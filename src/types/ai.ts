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
  customerId: string;
  /** Which formula was used */
  view: 'weekly' | 'monthly';
  /** Integer 0-100 */
  score: number;
  /** green >= 80 | amber 50-79 | red < 50 (backend SpendingScoreService.cs) — always
   * trust this field over re-deriving a band from `score`; the cutoffs are
   * admin-configurable server-side and don't match a naive 70/40 guess. */
  color: ScoreColor;
  /** One-word verdict in Vietnamese */
  verdictVi: string;
  /** One-line explanation in Vietnamese. Null when the AI provider was unavailable. */
  reasonVi: string | null;
  /** Full paragraph AI commentary for the score detail screen. Null when the AI provider was unavailable. */
  commentaryVi: string | null;
  /** ISO 8601 date "YYYY-MM-DD" -- always the Monday of the scored week */
  weekStart: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
  /**
   * Deterministic sub-scores behind `score`, 0-100 each. `null` when that
   * metric had insufficient data for the period (e.g. spikeScore needs ≥7
   * distinct spending days; savingsScore — monthly only — needs ≥3 months of
   * history). Not the customer's own budget/goal figures — spikeScore is a
   * spending-volatility z-score, budgetScore is needs/wants pacing (savings
   * excluded), savingsScore blends savings-category spend with saving-goal
   * contributions against a flat 20%-of-income target.
   */
  spikeScore?: number | null;
  budgetScore?: number | null;
  savingsScore?: number | null;
  /**
   * The post-renormalization weight (0-100) actually applied to each present
   * metric for THIS computation — not the admin-configured base weights.
   * Keyed by lowercase metric name ("spike" | "budget" | "savings").
   */
  weights?: Record<string, number>;
}

// -------------------------------------------------------------------------
// Weekly Report
// -------------------------------------------------------------------------

export interface WeeklyReport {
  id: string;
  customerId: string;
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
  customerId: string;
  role: ChatRole;
  content: string;
  /** Groups messages belonging to the same conversation session */
  sessionId: string;
  /** ISO 8601 timestamp */
  createdAt: string;
}

export interface ChatSession {
  sessionId: string;
  customerId: string;
  /** Preview of the first user message */
  previewText: string;
  /** ISO 8601 timestamp of most recent message */
  lastMessageAt: string;
  /**
   * Total message count in the session. Optional: the backend's ChatSessionResponse
   * carries no count, and deriving one would mean fetching every session's history.
   */
  messageCount?: number;
}

// -------------------------------------------------------------------------
// AI Categorization (auto-classify a transaction to a category)
// -------------------------------------------------------------------------

/**
 * Where a category assignment came from — matches the backend's
 * `CategorizationOutcome.Source` values exactly (MANUAL/RULE locked-in categories,
 * AI_AUTO applied automatically above the confidence threshold, AI_SUGGESTION produced
 * but not applied — see `Applied`/`suggestedCategoryId`, OFF when the customer disabled
 * AI categorization, FALLBACK when nothing resolved).
 */
export type CategorizationSource = 'MANUAL' | 'RULE' | 'AI_AUTO' | 'AI_SUGGESTION' | 'OFF' | 'FALLBACK';

/** Preview of what the AI would classify a free-text description as. */
export interface AiClassificationResult {
  /** Predicted category id, resolved from categoryName server-side (undefined when unresolved). */
  categoryId?: string;
  /** Predicted category name (may be undefined when the model abstains). */
  categoryName?: string;
  /** Model confidence, 0–1. */
  confidence: number;
}

/** Outcome of applying (or overriding) a categorization to a transaction. */
export interface CategorizationOutcome {
  transactionId: string;
  /** The category id actually written to the transaction — only set when `applied` is true. */
  categoryId?: string;
  categoryName?: string;
  confidence?: number;
  isAiClassified: boolean;
  /** True when the work was queued asynchronously rather than resolved inline. */
  queued: boolean;
  /** True when categoryId above was actually written to the transaction. When false and
   * source is AI_SUGGESTION, the suggestion sits in suggestedCategoryId/Name awaiting the
   * customer's acceptance. */
  applied: boolean;
  /** The AI's suggestion when `applied` is false (e.g. default suggest_only mode). */
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  /** Why the outcome landed where it did, e.g. "manual_locked", "below_threshold", "rate_limited". */
  reason?: string;
  source: CategorizationSource;
}

// -------------------------------------------------------------------------
// Suggested prompt chips shown when the AI Advisor opens (SPEC requirement)
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Customer AI preferences (services/real/aiPreferences.ts)
// -------------------------------------------------------------------------

export type CategorizationMode = 'off' | 'suggest_only' | 'high_confidence_auto';

export interface AiPreferences {
  categorizationMode: CategorizationMode;
  autoCategorizationThreshold: number;
  defaultHistoryEnabled: boolean;
  weeklyReportEnabled: boolean;
  shareBalances: boolean;
  shareTransactions: boolean;
  shareBudgets: boolean;
  shareGoals: boolean;
  shareReports: boolean;
  ragEnabled: boolean;
}

export type UpdateAiPreferencesInput = Partial<AiPreferences>;

export const SUGGESTED_PROMPTS_VI = [
  'Tháng này tôi tiêu nhiều nhất vào đâu?',
  'Tôi có đang chi tiêu quá mức không?',
  'Gợi ý cách tiết kiệm cho tháng tới?',
  'Danh mục nào vượt ngân sách tuần này?',
  'So sánh chi tiêu tháng này với tháng trước',
] as const;

export type SuggestedPrompt = (typeof SUGGESTED_PROMPTS_VI)[number];

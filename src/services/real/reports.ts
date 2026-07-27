/**
 * real/reports.ts — real .NET AI service (spending score, weekly report, chat).
 *
 * Mirrors src/services/mock/reports.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/ai/* (AiController), ApiResponse<T> envelope.
 *   - GET  /ai/score?period=WEEKLY|MONTHLY  → SpendingScoreResult
 *   - GET  /ai/reports                      → WeeklyReportResponse[]  (history, newest handling below)
 *   - GET  /ai/chat/history?limit           → ChatMessageResponse[]
 *
 * Backend gaps vs the mock contract:
 *   - The score endpoint returns a single Vietnamese `comment`; the mock split this
 *     into verdict/reason/commentary. We derive a short verdict from the colour band
 *     and reuse the comment for the reason + full commentary.
 *   - The backend has NO chat "session" concept — history is a flat list. We surface
 *     the whole history under one synthetic session so the session views keep working.
 */

import { api, unwrap } from '@/lib/api';
import type {
  SpendingScore,
  ScoreColor,
  WeeklyReport,
  ChatMessage,
  ChatSession,
  AiClassificationResult,
  CategorizationOutcome,
  CategorizationSource,
} from '@/types';

// Synthetic session id — the backend keeps a single flat history per customer.
const DEFAULT_SESSION_ID = 'default';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface SpendingScoreDto {
  periodType: string; // "WEEKLY" | "MONTHLY"
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string;
  finalScore: number;
  spikeScore: number | null;
  budgetScore: number | null;
  savingsScore: number | null;
  weights: Record<string, number>;
  colorBadge: string; // "GREEN" | "YELLOW" | "RED"
  comment: string | null;
}

interface WeeklyReportDto {
  reportId: string;
  periodStart: string;
  periodEnd: string;
  narrative: string;
  finalScore: number | null;
  colorBadge: string | null;
  generatedAt: string;
}

interface ChatMessageDto {
  messageId: string;
  senderType: string; // "USER" | "AI"
  content: string;
  timestamp: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toColor(badge: string | null): ScoreColor {
  switch ((badge ?? '').toUpperCase()) {
    case 'GREEN':
      return 'green';
    case 'RED':
      return 'red';
    default:
      return 'amber';
  }
}

const VERDICT_VI: Record<ScoreColor, string> = {
  green: 'Tốt',
  amber: 'Trung bình',
  red: 'Cần cải thiện',
};

function toSpendingScore(dto: SpendingScoreDto, view: 'weekly' | 'monthly'): SpendingScore {
  const color = toColor(dto.colorBadge);
  const comment = dto.comment ?? '';
  return {
    id: `score_${dto.periodType}_${dto.periodStart}`,
    customerId: '',
    view,
    score: Math.round(dto.finalScore),
    color,
    verdictVi: VERDICT_VI[color],
    reasonVi: comment,
    commentaryVi: comment,
    weekStart: dto.periodStart,
    generatedAt: new Date().toISOString(),
  };
}

function toWeeklyReport(dto: WeeklyReportDto): WeeklyReport {
  return {
    id: dto.reportId,
    customerId: '',
    reportTextVi: dto.narrative,
    weekStart: dto.periodStart,
    generatedAt: dto.generatedAt,
    // Backend WeeklyReportResponse carries no read flag — reports are informational.
    isRead: false,
  };
}

function toChatMessage(dto: ChatMessageDto): ChatMessage {
  return {
    id: dto.messageId,
    customerId: '',
    role: (dto.senderType ?? '').toUpperCase() === 'AI' ? 'assistant' : 'user',
    content: dto.content,
    sessionId: DEFAULT_SESSION_ID,
    createdAt: dto.timestamp ?? '',
  };
}

// ─── Spending score ───────────────────────────────────────────────────────────

export async function getSpendingScore(
  view: 'weekly' | 'monthly' = 'weekly',
): Promise<SpendingScore> {
  const period = view === 'monthly' ? 'MONTHLY' : 'WEEKLY';
  const res = await api.get('/ai/score', { params: { period } });
  return toSpendingScore(unwrap<SpendingScoreDto>(res), view);
}

// ─── Weekly report (latest) ─────────────────────────────────────────────────────

/**
 * The mock returns a single "current" report; the backend returns the full
 * history. We surface the newest one so the report screen shows the latest week.
 */
export async function getWeeklyReport(): Promise<WeeklyReport | null> {
  const res = await api.get('/ai/reports');
  const reports = unwrap<WeeklyReportDto[]>(res) ?? [];
  if (reports.length === 0) return null;
  const latest = [...reports].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  )[0];
  return toWeeklyReport(latest);
}

// ─── Chat ───────────────────────────────────────────────────────────────────

async function fetchChatHistory(limit = 50): Promise<ChatMessage[]> {
  const res = await api.get('/ai/chat/history', { params: { limit } });
  return unwrap<ChatMessageDto[]>(res).map(toChatMessage);
}

export function getChatHistory(): Promise<ChatMessage[]> {
  return fetchChatHistory();
}

/**
 * The backend keeps a single flat history (no sessions). We fold it into one
 * synthetic session so the session-list UI keeps rendering; an empty history
 * yields no sessions.
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const history = await fetchChatHistory();
  if (history.length === 0) return [];
  const firstUser = history.find((m) => m.role === 'user');
  const last = history[history.length - 1];
  return [
    {
      sessionId: DEFAULT_SESSION_ID,
      customerId: '',
      previewText: firstUser?.content ?? history[0].content,
      lastMessageAt: last.createdAt,
      messageCount: history.length,
    },
  ];
}

export function getChatSessionMessages(_sessionId: string): Promise<ChatMessage[]> {
  // Only one (synthetic) session exists — return the full history regardless of id.
  return fetchChatHistory();
}

/**
 * POST /ai/chat — send a question and get the assistant's reply. The RAG pipeline
 * can be slow, so allow a generous timeout. Returns only the AI message; the caller
 * already knows the user's question.
 */
export async function sendChatMessage(question: string): Promise<ChatMessage> {
  const res = await api.post('/ai/chat', { question }, { timeout: 120_000 });
  return toChatMessage(unwrap<ChatMessageDto>(res));
}

// ─── Weekly report (force-generate) ─────────────────────────────────────────────

/**
 * POST /ai/reports/generate — force-generate the last completed week's report
 * (LLM narrative, can take ~30s+). Returns the freshly generated report.
 */
export async function generateWeeklyReport(): Promise<WeeklyReport> {
  const res = await api.post('/ai/reports/generate', undefined, { timeout: 120_000 });
  return toWeeklyReport(unwrap<WeeklyReportDto>(res));
}

// ─── AI categorization ──────────────────────────────────────────────────────────

interface AiClassificationDto {
  categoryName?: string | null;
  confidence: number;
}

interface CategorizationOutcomeDto {
  transactionId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  confidence?: number | null;
  isAiClassified: boolean;
  queued: boolean;
  source: string;
}

function toClassification(dto: AiClassificationDto): AiClassificationResult {
  return { categoryName: dto.categoryName ?? undefined, confidence: dto.confidence };
}

function toSource(raw: string): CategorizationSource {
  const v = (raw ?? '').toUpperCase();
  return v === 'RULE' || v === 'AI' || v === 'FALLBACK' ? (v as CategorizationSource) : 'FALLBACK';
}

function toOutcome(dto: CategorizationOutcomeDto): CategorizationOutcome {
  return {
    transactionId: dto.transactionId,
    categoryId: dto.categoryId ?? undefined,
    categoryName: dto.categoryName ?? undefined,
    confidence: dto.confidence ?? undefined,
    isAiClassified: dto.isAiClassified,
    queued: dto.queued,
    source: toSource(dto.source),
  };
}

/** POST /ai/categorize/preview — what would the AI classify this text as? */
export async function previewCategorization(
  input: string,
): Promise<AiClassificationResult> {
  const res = await api.post('/ai/categorize/preview', { input });
  return toClassification(unwrap<AiClassificationDto>(res));
}

/** POST /ai/categorize/{id} — run auto-categorization on an existing transaction. */
export async function categorizeTransaction(
  transactionId: string,
): Promise<CategorizationOutcome> {
  const res = await api.post(`/ai/categorize/${transactionId}`);
  return toOutcome(unwrap<CategorizationOutcomeDto>(res));
}

/** POST /ai/transactions/{id}/override — force a category and teach the model. */
export async function overrideCategorization(
  transactionId: string,
  categoryId: string,
): Promise<CategorizationOutcome> {
  const res = await api.post(`/ai/transactions/${transactionId}/override`, {
    categoryId,
  });
  return toOutcome(unwrap<CategorizationOutcomeDto>(res));
}

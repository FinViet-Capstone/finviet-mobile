/**
 * real/reports.ts — real .NET AI service (spending score, weekly report, chat).
 *
 * Mirrors src/services/mock/reports.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/ai/* (AiController), ApiResponse<T> envelope.
 *   - GET  /ai/score?period=WEEKLY|MONTHLY  → SpendingScoreResult
 *   - GET  /ai/reports                      → WeeklyReportResponse[]  (history, newest handling below)
 *   - GET  /ai/chat/sessions                → ChatSessionResponse[]   (newest activity first)
 *   - POST /ai/chat/sessions                → ChatSessionResponse
 *   - GET  /ai/chat/history?sessionId&limit → ChatMessageResponse[]
 *   - POST /ai/chat  { sessionId?, question } → ChatMessageResponse
 *
 * Backend gaps vs the mock contract:
 *   - The score endpoint returns a single Vietnamese `comment`; the mock split this
 *     into verdict/reason/commentary. We derive a short verdict from the colour band
 *     and reuse the comment for the reason + full commentary.
 *   - ChatSessionResponse has no message count and no per-session count endpoint, so
 *     `messageCount` is left undefined rather than costing an N+1 history fetch.
 *   - It has no first-message preview either, and the server titles an untitled session
 *     "Cuộc trò chuyện mới". We title a session with its opening question instead, which
 *     makes `title` the preview the session list wants.
 *
 * Omitting `sessionId` anywhere below targets the customer's single *default* session
 * (AiChatService.ResolveSessionAsync creates it on demand) — it never opens a new one,
 * which is why starting a fresh conversation goes through createChatSession().
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

/** `AiChatService.NormalizeTitle` rejects anything longer with a 400. */
const MAX_SESSION_TITLE_LENGTH = 120;

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
  sessionId: string;
  senderType: string; // "USER" | "AI"
  content: string;
  timestamp: string | null;
}

interface ChatSessionDto {
  sessionId: string;
  title: string;
  historyEnabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  /** null until the session's first exchange lands. */
  lastMessageAt: string | null;
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
  // Backend returns comment: null when the AI provider was unavailable — keep that
  // as null (not '') so the FE's `??` fallback text actually renders instead of
  // silently showing a blank box.
  const comment = dto.comment && dto.comment.trim().length > 0 ? dto.comment : null;
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
    spikeScore: dto.spikeScore,
    budgetScore: dto.budgetScore,
    savingsScore: dto.savingsScore,
    weights: dto.weights,
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
    sessionId: dto.sessionId,
    createdAt: dto.timestamp ?? '',
  };
}

function toChatSession(dto: ChatSessionDto): ChatSession {
  return {
    sessionId: dto.sessionId,
    customerId: '',
    previewText: dto.title,
    // A session with no messages yet has lastMessageAt null — fall back so the
    // drawer still renders a date instead of "Invalid Date".
    lastMessageAt: dto.lastMessageAt ?? dto.updatedAt ?? dto.createdAt,
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
export async function getWeeklyReport(reportId?: string): Promise<WeeklyReport | null> {
  if (reportId) {
    const res = await api.get(`/ai/reports/${encodeURIComponent(reportId)}`);
    return toWeeklyReport(unwrap<WeeklyReportDto>(res));
  }

  const res = await api.get('/ai/reports');
  const reports = unwrap<WeeklyReportDto[]>(res) ?? [];
  if (reports.length === 0) return null;
  const latest = [...reports].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  )[0];
  return toWeeklyReport(latest);
}

// ─── Chat ───────────────────────────────────────────────────────────────────

const ROLE_ORDER: Record<ChatMessage['role'], number> = { user: 0, assistant: 1 };

async function fetchChatHistory(sessionId?: string, limit = 50): Promise<ChatMessage[]> {
  const res = await api.get('/ai/chat/history', {
    params: sessionId ? { sessionId, limit } : { limit },
  });
  // AiChatService.CompleteTurnAsync stamps both halves of an exchange with the same
  // CreatedAt, and the query only orders by that column — so the answer can come back
  // ahead of its own question. Break the tie by role. Timestamps mix `Z` and `+07:00`
  // offsets, so compare parsed values, not strings.
  return unwrap<ChatMessageDto[]>(res)
    .map(toChatMessage)
    .sort((a, b) => {
      const byTime = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return byTime !== 0 ? byTime : ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    });
}

/** Flat history of the default session (see the omitted-sessionId note up top). */
export function getChatHistory(): Promise<ChatMessage[]> {
  return fetchChatHistory();
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const res = await api.get('/ai/chat/sessions');
  return unwrap<ChatSessionDto[]>(res).map(toChatSession);
}

export function getChatSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return fetchChatHistory(sessionId);
}

/**
 * POST /ai/chat/sessions — open a conversation of its own. `title` is what the
 * session list shows as its preview, so callers pass the opening question.
 */
export async function createChatSession(title?: string): Promise<ChatSession> {
  const trimmed = title?.trim().slice(0, MAX_SESSION_TITLE_LENGTH);
  const res = await api.post('/ai/chat/sessions', {
    title: trimmed && trimmed.length > 0 ? trimmed : null,
  });
  return toChatSession(unwrap<ChatSessionDto>(res));
}

/**
 * POST /ai/chat — send a question and get the assistant's reply. The RAG pipeline
 * can be slow, so allow a generous timeout. Returns only the AI message; the caller
 * already knows the user's question. Without `sessionId` the exchange lands in the
 * default session.
 */
export async function sendChatMessage(
  question: string,
  sessionId?: string,
): Promise<ChatMessage> {
  const res = await api.post(
    '/ai/chat',
    { question, sessionId: sessionId ?? null },
    { timeout: 120_000 },
  );
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

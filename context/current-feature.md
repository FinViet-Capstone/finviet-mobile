# Current Feature

<!-- Feature name and short description -->
Feat: wire the AI chat to the backend's **real multi-session** endpoints. `src/services/real/reports.ts`
was written against the older flat-history contract and fabricates a single synthetic session
(`DEFAULT_SESSION_ID = 'default'`); `finviet-be` has had real chat sessions since commit `c83a331`
(2026-08-12).

## Status

<!-- Not Started | In Progress | Completed -->
In Progress — implemented and verified against a live API; not yet committed or merged

## Goals

<!-- Goals and requirements -->
- Backend endpoints now available and unused by the app (verified directly against
  `finviet-be/src/FinViet.Api/Controllers/AiController.cs` and `Infrastructure/Services/AiChatService.cs`,
  not the markdown reference):
  - `GET /ai/chat/sessions` → `ChatSessionResponse[]`, ordered by `lastMessageAt ?? createdAt` desc
  - `POST /ai/chat/sessions` `{ title?, historyEnabled? }` → creates a non-default session
  - `PATCH`/`DELETE /ai/chat/sessions/{id}` (rename / soft-delete)
  - `GET /ai/chat/history?sessionId=&limit=` — per-session, not flat
  - `POST /ai/chat` now takes `{ sessionId?, question }`
- Replace the synthetic-session code in `real/reports.ts` with the real endpoints:
  `getChatSessions()` hits `/ai/chat/sessions` instead of folding flat history into one fake row;
  `getChatSessionMessages(id)` passes `sessionId` through; `sendChatMessage()` gains an optional
  `sessionId`; `toChatMessage()` uses the DTO's real `sessionId` instead of the `'default'` constant.
- Add `createChatSession(title?)`. Needed because `AiChatService.ResolveSessionAsync` treats a null
  `sessionId` as "the one default session" (`SessionId == customerId`, `IsDefault = true`) — it never
  opens a new one. Without an explicit create, the "+ new chat" button would keep writing into the
  same default session and the history drawer would never grow, which is the bug being fixed.
- Session **title is the preview**: the backend has no first-message-preview column and
  `NormalizeTitle(null)` yields the literal `"Cuộc trò chuyện mới"` for every session. The app
  therefore titles a session with its opening question (truncated to the backend's 120-char limit),
  so `ChatSession.previewText` stays meaningful — matching the mock's documented semantics.
- `ChatSession.messageCount` becomes optional: `ChatSessionResponse` carries no count and there is no
  per-session count endpoint, so filling it would mean fetching every session's history (N+1). The
  history drawer omits the "N tin nhắn" suffix when it's absent rather than showing a fabricated `0`.
- Keep mock ⇄ real swappable: `mock/reports.ts` gets the same `createChatSession` and the same
  optional-`sessionId` signatures, otherwise the `USE_MOCK ? mock : real` union in the barrel stops
  being callable with the new arguments.
- Out of scope: rename/delete session UI (`PATCH`/`DELETE` stay unwired — no UI exists for them),
  `historyEnabled` toggling, and the new `citations`/`limitations`/`dataPeriod` fields on
  `ChatMessageResponse` (the FE `ChatMessage` type has nowhere to put them).

## Notes

<!-- Any extra notes -->
Ordering caveat: the session is created *before* the AI answer is requested, so a failed AI call can
leave an empty session in the drawer (title set, `lastMessageAt` null). The alternative — send first,
create after — is worse: a null `sessionId` writes the exchange into the default session, which is
exactly the behaviour being removed.

`GET /ai/chat/history` with no `sessionId` still resolves to the default session, so the existing
`getChatHistory()` / `useChatHistory()` pair keeps working unchanged.

Local `dev` was 16 commits behind `origin/dev` when this branch was cut; none of those commits touch
`services/`, `hooks/useReports.ts` or `AIChatbotSheet.tsx` (they are tab-bar / numpad / contrast UI
fixes), so there is no conflict risk.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous three branches (shipped-endpoint wiring; transaction-edit + goal-ledger
  wiring; SePay OAuth fix) merged to `dev`. Started this feature — verified the complete error
  code list against `finviet-be` source directly rather than trusting the markdown reference
  alone, since it was already found to be incomplete for this exact list.
- 2026-08-10 — Implemented: `BUSINESS_RULE_MESSAGES_VI` (38 codes) added to
  `src/utils/errors.ts`; `getApiErrorMessage()` now checks `code` first, ahead of the raw
  `message`; consolidated `app/(tabs)/wallets/[id].tsx`'s local `WALLET_DELETE_ERROR_MESSAGES`
  duplicate into the shared map and upgraded its sync/unlink error handlers to the same
  utility. Added `src/utils/__tests__/errors.test.ts` (8 tests: code-priority-over-message,
  the dynamic `sepay_error_{status}` catch-all, FluentValidation field-error fallback,
  non-axios-error safety, and a completeness check that every mapped code has a non-empty
  message). type-check/lint/72 tests all pass (64 prior + 8 new). This closes out every item
  from the FE↔BE reconciliation plan.
- 2026-08-13 — Audited the whole mobile↔backend API surface: all 68 `real/*` calls resolve against
  the current `finviet-be` controllers (the app is **not** pointed at an old backend), but four
  areas lag the current contract — multi-session AI chat, `/profile/ai-preferences`, `/extract/csv`,
  and `/extract/photo` (the last correctly stays mock: its OCR provider is an unwired scaffold that
  returns 503). Started this branch for the first and largest of those.
- 2026-08-13 — Implemented on `feature/real-chat-sessions`: `real/reports.ts` chat block rewritten
  onto `/ai/chat/sessions` + per-session `/ai/chat/history`, `sendChatMessage(question, sessionId?)`,
  new `createChatSession(title?)`, and `toChatMessage` now reads the DTO's real `sessionId`;
  `messageCount` made optional in `types/ai.ts` with the drawer omitting the suffix when absent;
  `mock/reports.ts` given matching signatures + its own `createChatSession`; `useSendChatMessage`
  now takes `{ question, sessionId }` and added `useCreateChatSession`; `AIChatbotSheet` tracks
  `activeSessionId` (cleared by "+", set when a session is opened, created on the first message of
  a fresh conversation). type-check clean, lint clean on all changed files, 112/112 Jest tests pass.
- 2026-08-13 — Verified against a live backend (18 assertions replaying the exact HTTP calls the
  new service issues, as the seeded demo customer): session create/list/scoping, the 120-char title
  slice avoiding `NormalizeTitle`'s 400, the `lastMessageAt ?? updatedAt` fallback on a
  never-used session, a real Gemini round trip landing in the right session, and newest-first
  ordering. **Found one backend defect**: `AiChatService.CompleteTurnAsync` stamps the user and
  assistant rows of an exchange with the *same* `CreatedAt`
  (`AiChatService.cs:247`/`:256`), while `GetHistoryAsync` orders by that column alone — so
  Postgres can and does return the answer before its own question (observed live). Mitigated
  client-side in `fetchChatHistory` with a role tiebreak (`user` before `assistant`) on equal
  timestamps, comparing parsed values because the API mixes `Z` and `+07:00` offsets. The real fix
  belongs in `finviet-be` (give the assistant row a later timestamp, or add a secondary sort key)
  and is filed separately. Re-verified: 18/18 assertions pass, type-check clean, lint clean on
  changed files, 112/112 Jest tests pass. Test sessions created during the run were deleted (204).

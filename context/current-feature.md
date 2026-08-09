# Current Feature

<!-- Feature name and short description -->
Fix: Budget screen UX pass — Budget Allocation screen (income editing, per-bucket lock, precise entry) and Budgets tab `BucketCard` color-coding.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Budget Allocation screen — income edit affordance: the income card was already tappable (opens `NumericKeypad`) but looked like static text — add a pencil icon + "Chạm để sửa · Áp dụng từ tháng tới" hint so the capability and its next-month scoping are both discoverable.
- Per-bucket lock: add a lock icon per bucket (`BucketCard`) so locking one keeps its % fixed while the other two rebalance between themselves (instead of today's always-proportional 3-way redistribution). `CustomSlider` gains a new `disabled` prop (`.enabled(!disabled)` on its pan/tap gestures + opacity dim) to make a locked bucket's slider non-interactive. Only one bucket can be locked at a time (`lockedBucket: 'needs'|'wants'|'savings'|null`).
- Precise numeric entry: generalize the screen's single income-only keypad state into an `activeField` router so tapping any bucket's `%` also opens the same shared `NumericKeypad`, committing through the same `handleNeeds`/`handleWants`/`handleSavings` handlers the sliders already use — so typed entry is automatically lock-aware and always sums to exactly 100%.
- Out of scope: `OnboardingAllocation.tsx` has its own separate proportional-redistribution copy — not touched, no lock/keypad request was made for onboarding.
- Round 2 (found verifying round 1 on-device): income `Clear` silently redisplayed the current month's income instead of clearing, because `income = parsedIncome > 0 ? parsedIncome : current.monthlyIncome` couldn't distinguish "not yet seeded" from "user cleared it" — both look like `incomeRaw === ''`. Fixed by gating render on `!seeded` (so `incomeRaw` is always genuinely populated by the time the screen is interactive) and dropping the fallback entirely (`income = parseInt(incomeRaw || '0', 10)`). Added the validation the user asked for: income must be `> 0` to save (`isValid = total === 100 && isIncomeValid`), surfaced as a red border + "Thu nhập phải lớn hơn 0" hint, no auto-revert.
- Round 2 also fixed: editing a bucket's % opened the keypad but the keypad visually covered the field (buckets sit below the income card in the ScrollView), and tapping outside to scroll just closed the keypad (`NumericKeypad`'s full-screen backdrop intercepts all touches over the ScrollView). User chose (over switching to the native OS keyboard, which would've contradicted `context/coding-standards.md`'s documented custom-keypad convention) to keep the custom keypad and auto-scroll the tapped field into view. Added `NUMPAD_HEIGHT` bottom padding (a baseline convention every other keypad-using screen already has but this one was missing) plus new scroll-into-view logic via `onLayout` per `BucketCard` + `ScrollView.scrollTo` in `openField` — no existing pattern for this existed in the codebase to reuse, built fresh.
- Budgets tab (separate screen, separate concern) — the badge shown when a bucket's category limits exceeded its allocation cap (`overAllocBadge`, text "vượt mức") was getting clipped/unreadable at the card's fixed width (3-per-row). Replaced the text badges (`overGoalBadge`/`overAllocBadge`, now deleted along with their `S.overGoal`/`S.overLimit` strings) with whole-card background/border/icon/amount-text color-coding, reusing the app's existing `COLORS.budget.safe/warning/danger` palette (already documented in `theme.ts` for exactly this <60%/60–80%/>80% semantic, previously unused by this component).
- Needs/Wants: green under 60% spent, amber 60–80%, red above 80% — spend pace (`summary.percentage`) only. User explicitly asked to drop the separate over-allocated-config signal (comparing summed category limits vs. the bucket's allocation cap) from the color logic, so a bucket colors purely by actual spend percentage regardless of how its category limits are configured — that variable was removed.
- Savings keeps its existing documented behavior unchanged: neutral/untinted below its target, green only when exceeding it — never warning/danger, per project-spec's "exceeding a savings target is good" rule.

## Notes

<!-- Any extra notes -->
Verified on the user's device.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started.
- 2026-08-09 — Budget Allocation round 1 (income affordance, bucket lock, typed %-entry) implemented and verified on-device.
- 2026-08-09 — Budget Allocation round 2 (income Clear bug + validation, keypad-covers-field scroll fix) implemented and verified on-device.
- 2026-08-09 — Budgets tab `BucketCard` color-coding implemented (initially included an over-allocated-config signal in the warning tier, then removed per user feedback so coloring is spend-percentage-only) and verified on-device.
- 2026-08-09 — Both merged into dev.

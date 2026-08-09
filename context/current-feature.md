# Current Feature

<!-- Feature name and short description -->
Fix: 3 UX problems on the Budget Allocation screen — undiscoverable income editing, no way to lock a bucket while rebalancing the other two, no precise numeric entry for percentages.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Income edit affordance: the income card was already tappable (opens `NumericKeypad`) but looked like static text — add a pencil icon + "Chạm để sửa · Áp dụng từ tháng tới" hint so the capability and its next-month scoping are both discoverable.
- Per-bucket lock: add a lock icon per bucket (`BucketCard`) so locking one keeps its % fixed while the other two rebalance between themselves (instead of today's always-proportional 3-way redistribution). `CustomSlider` gains a new `disabled` prop (`.enabled(!disabled)` on its pan/tap gestures + opacity dim) to make a locked bucket's slider non-interactive. Only one bucket can be locked at a time (`lockedBucket: 'needs'|'wants'|'savings'|null`).
- Precise numeric entry: generalize the screen's single income-only keypad state into an `activeField` router so tapping any bucket's `%` also opens the same shared `NumericKeypad`, committing through the same `handleNeeds`/`handleWants`/`handleSavings` handlers the sliders already use — so typed entry is automatically lock-aware and always sums to exactly 100%.
- Out of scope: `OnboardingAllocation.tsx` has its own separate proportional-redistribution copy — not touched, no lock/keypad request was made for onboarding.
- Round 2 (found verifying round 1 on-device): income `Clear` silently redisplayed the current month's income instead of clearing, because `income = parsedIncome > 0 ? parsedIncome : current.monthlyIncome` couldn't distinguish "not yet seeded" from "user cleared it" — both look like `incomeRaw === ''`. Fixed by gating render on `!seeded` (so `incomeRaw` is always genuinely populated by the time the screen is interactive) and dropping the fallback entirely (`income = parseInt(incomeRaw || '0', 10)`). Added the validation the user asked for: income must be `> 0` to save (`isValid = total === 100 && isIncomeValid`), surfaced as a red border + "Thu nhập phải lớn hơn 0" hint, no auto-revert.
- Round 2 also fixed: editing a bucket's % opened the keypad but the keypad visually covered the field (buckets sit below the income card in the ScrollView), and tapping outside to scroll just closed the keypad (`NumericKeypad`'s full-screen backdrop intercepts all touches over the ScrollView). User chose (over switching to the native OS keyboard, which would've contradicted `context/coding-standards.md`'s documented custom-keypad convention) to keep the custom keypad and auto-scroll the tapped field into view. Added `NUMPAD_HEIGHT` bottom padding (a baseline convention every other keypad-using screen already has but this one was missing) plus new scroll-into-view logic via `onLayout` per `BucketCard` + `ScrollView.scrollTo` in `openField` — no existing pattern for this existed in the codebase to reuse, built fresh.

## Notes

<!-- Any extra notes -->
Both rounds verified working on the user's device.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started.
- 2026-08-09 — Round 1 (income affordance, bucket lock, typed %-entry) implemented and verified on-device.
- 2026-08-09 — Round 2 (income Clear bug + validation, keypad-covers-field scroll fix) implemented and verified on-device. Completed.

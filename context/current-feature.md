# Current Feature

<!-- Feature name and short description -->
Fix: Budgets tab `BucketCard` "vượt mức" badge unreadable, replaced with background color-coding.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- The badge shown when a bucket's category limits exceeded its allocation cap (`overAllocBadge`, text "vượt mức") was getting clipped/unreadable at the card's fixed width (3-per-row). Replaced the text badges (`overGoalBadge`/`overAllocBadge`, now deleted along with their `S.overGoal`/`S.overLimit` strings) with whole-card background/border/icon/amount-text color-coding, reusing the app's existing `COLORS.budget.safe/warning/danger` palette (already documented in `theme.ts` for exactly this <60%/60–80%/>80% semantic, previously unused by this component).
- Needs/Wants: green under 60% spent, amber 60–80%, red above 80% — spend pace (`summary.percentage`) only. User explicitly asked to drop the separate over-allocated-config signal (comparing summed category limits vs. the bucket's allocation cap) from the color logic, so a bucket colors purely by actual spend percentage regardless of how its category limits are configured — that variable was removed.
- Savings keeps its existing documented behavior unchanged: neutral/untinted below its target, green only when exceeding it — never warning/danger, per project-spec's "exceeding a savings target is good" rule.

## Notes

<!-- Any extra notes -->
Verified on the user's device.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started, implemented (initially included an over-allocated-config signal in the warning tier, then removed per user feedback so coloring is spend-percentage-only), and verified on-device. Completed.

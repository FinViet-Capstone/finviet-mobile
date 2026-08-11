# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md. (never delete the guiding comments in that file)
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Test** - Verify it works in the browser. Implement unit testing later. Run `npm run build` and fix any errors
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after build passes and everything works
7. **Merge** - Merge to `dev` (the shared integration branch every feature/fix branch merges into — `main` is a separate release branch updated on its own cadence, not per-fix, so don't merge feature/fix branches directly into it unless explicitly asked). Both `dev` and `main` are ruleset-protected (see Branching below) — merging means opening a PR and getting it approved, not pushing/merging directly.
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build passes. If build fails, fix the issues first.

## Bug Fixes

For bug reports specifically, follow: **diagnose → plan → ask → fix**.

- **Diagnose** - Investigate and confirm the root cause in the actual code before proposing anything. Cite the exact file/line responsible; don't guess.
- **Plan** - Write up the root cause and the proposed fix (what changes, why, and what's explicitly out of scope).
- **Ask** - Get explicit go-ahead on the plan before writing any code — this is separate from, and earlier than, asking before committing.
- **Fix** - Implement, then verify per the Test step above.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

**Branch protection (GitHub ruleset `protect-main-dev`, added 2026-08-11):** `main`
and `dev` both block direct pushes, merges, force pushes, and branch deletion —
everything lands via an approved PR.
- Requires a PR before merging, ≥1 approval, stale approvals dismissed whenever new
  commits are pushed, and approval of the most recent push specifically.
- Only `NhanNguyen275`, `dekukoi`, `sdkoi98`, and the Vercel app are allowed to
  dismiss PR reviews.
- Force pushes and deletions are blocked on both branches (no bypass actors
  configured).

Since `git push`/merge to `dev` or `main` will simply be rejected now, treat "Merge"
in the Workflow above as "open a PR and get it approved" rather than a direct
merge. For work that isn't a discrete feature/fix (build/deploy config, CI, etc.), a
personal branch (e.g. `khoi`) is fine in place of `feature/`/`fix/` naming — same PR
requirement applies to land it in `dev`.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Keep commit messages concise — short subject line only, no long explanatory bodies
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)

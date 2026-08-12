# FinViet

Expo/React Native personal finance app for the Vietnamese market. This repo is the
**mobile frontend only**; the .NET 8 backend (`finviet-be`) and admin dashboard are
separate repos and out of scope here.

## Context Files

Read the following to get the full context of the project:

- @context/project-spec.md
- @context/architecture.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- `npm start` — start the Expo dev server
- `npm run android` — `expo run:android`
- `npm run ios` — `expo run:ios`
- `npm run type-check` — `tsc --noEmit`
- `npm run lint` — ESLint via the flat config in `eslint.config.js`
- `npm test` — Jest (`npm run test:watch` for watch mode; `npx jest path/to/file.test.ts` for a single file)

There is no build step for JS bundling in day-to-day dev — `type-check` + `lint` +
`test` is the standard verification loop before committing. Test files live under
`__tests__/` next to the code they cover (e.g.
`src/utils/__tests__/formatters.test.ts`).

# Podman Desktop Bot

## Project Overview

GitHub cron bot that automates triage, milestone management, PR reviews, and Slack notifications for the Podman Desktop repository.

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Language:** TypeScript (strict mode, decorators enabled)
- **DI:** Inversify 8+ with reflect-metadata
- **GitHub API:** Octokit (REST + GraphQL) via @octokit/app
- **Testing:** Vitest
- **Build:** Vite (library mode)
- **Package Manager:** pnpm

### Dependency Injection

- All classes use `@injectable()` decorator
- Dependencies injected via `@inject()` field decorators
- Modules registered in `src/inversify-binding.ts`
- Helpers in `src/helpers/helpers-module.ts`, infos in `src/info/infos-module.ts`

### Path Aliases

- `/@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- Use `/@/helpers/...`, `/@/logic/...`, `/@/api/...` etc. for source imports
- Parent relative imports (`../`) are forbidden — always use `/@/` alias

### Biome Formatting

- Line width: 120
- Indent style: spaces
- Single quotes for JavaScript/TypeScript
- Arrow parens: as needed
- Bracket same line: true
- Organize imports: off (handled by ESLint)


## Coding Conventions

### General

- Use Inversify decorators for DI (`@injectable()`, `@inject()`)
- Helpers are singletons bound in `helpers-module.ts`
- Logic classes are bound as singletons, then to both `ScheduleListener` and `PushListener`, then to `Logic` in `logic-module.ts`
- Tests are colocated with source files (`*.spec.ts` next to `*.ts`)
- Tests use Vitest with `reflect-metadata` import at top
- Use `/@/` path alias for imports between source files

### TypeScript Rules

- **Consistent type imports:** use `import type { ... }` for type-only imports (`@typescript-eslint/consistent-type-imports`)
- **No `any`:** avoid `any` — use proper types or `unknown` (`@typescript-eslint/no-explicit-any`)
- **Explicit return types:** all functions must have explicit return type annotations (`@typescript-eslint/explicit-function-return-type`)
- **Await thenable:** only `await` expressions that return a Promise (`@typescript-eslint/await-thenable`)
- **No floating promises:** all promises must be handled — use `await`, `.then()`, or `void` operator (`@typescript-eslint/no-floating-promises`)
- **No misused promises:** do not pass promises where non-promise values are expected (`@typescript-eslint/no-misused-promises`)
- **Prefer optional chain:** use `a?.b` instead of `a && a.b` (`@typescript-eslint/prefer-optional-chain`)
- **Prefer nullish coalescing:** use `??` instead of `||` for nullable values (`@typescript-eslint/prefer-nullish-coalescing`)
- **Strict equality:** always use `===` / `!==` (`eqeqeq`)
- **Prefer promise reject errors:** always reject with an `Error` object (`prefer-promise-reject-errors`)

### Style Rules

- **Semicolons:** always required (`semi: always`)
- **Quotes:** single quotes only, template literals allowed (`quotes: single`)
- **Trailing commas:** always in multiline, warn severity (`comma-dangle: warn, always-multiline`)
- **Capitalized comments:** comments must start with uppercase (`capitalized-comments`)
- **No null:** avoid `null` — use `undefined` instead (`no-null/no-null`)
- **Redundant undefined:** avoid explicit `undefined` in optional parameters (`redundant-undefined/redundant-undefined`)
- **Node protocol:** use `node:` prefix for Node.js built-in imports (`unicorn/prefer-node-protocol`)

### Import Rules

- **No duplicates:** merge imports from the same module (`import/no-duplicates`)
- **Imports first:** all imports must be at the top of the file (`import/first`)
- **Newline after imports:** blank line required after import block (`import/newline-after-import`)
- **No extraneous dependencies:** only import packages listed in package.json (`import/no-extraneous-dependencies`)
- **No parent relative imports:** never use `../` imports — use `/@/` path alias instead (`no-restricted-imports`)

### Vitest / Testing Rules

- **Test function:** use `test()` not `it()` — both at top level and inside `describe` (`vitest/consistent-test-it: fn: test`)
- **Mock function:** use `vi` not `jest` (`vitest/consistent-vitest-vi: fn: vi`)
- **Filename pattern:** test files must match `*.spec.ts` (`vitest/consistent-test-filename`)
- **Hooks on top:** place `beforeEach`/`afterEach` at top of describe block (`vitest/prefer-hooks-on-top`)
- **APIs on top:** `vi.mock()` and `vi.hoisted()` calls at top (`vitest/hoisted-apis-on-top`). Note: never use vi.hoisted
- **Mock with import:** use `vi.mock(import('/@/path/to/module'))` instead of `vi.mock('/@/path/to/module')` — using `import()` ensures the mocked modules are always resolved
- **No alias methods:** use canonical assertion names (`vitest/no-alias-methods`)
- **No conditional tests:** avoid `if`/`switch` inside tests (`vitest/no-conditional-in-test`)
- **No conditional expect:** avoid `expect` inside conditionals (`vitest/no-conditional-expect`)
- **No duplicate hooks:** one `beforeEach`/`afterEach` per describe (`vitest/no-duplicate-hooks`)
- **No identical titles:** test titles must be unique within a describe (`vitest/no-identical-title`)
- **Prefer mock shorthand:** use `mockResolvedValue` instead of `mockImplementation(() => Promise.resolve(...))` (`vitest/prefer-mock-promise-shorthand`)
- **Prefer mock return shorthand:** use `mockReturnValue` instead of `mockImplementation(() => value)` (`vitest/prefer-mock-return-shorthand`)
- **Prefer equality matcher:** use `toEqual`/`toBe` over generic `expect` patterns (`vitest/prefer-equality-matcher`)
- **Prefer toContain:** use `toContain` for array/string inclusion checks (`vitest/prefer-to-contain`)
- **Prefer called exactly once:** use `toHaveBeenCalledExactlyOnceWith` when applicable (`vitest/prefer-called-exactly-once-with`)
- **Prefer each:** use `test.each` for parameterized tests (`vitest/prefer-each`)
- **Prefer expect typeof:** use `toBeTypeOf` over `typeof` comparisons (`vitest/prefer-expect-type-of`)
- **Expect assertions:** every test must have `expect.assertions(<number>)` as its first expression — count the exact number of `expect()` calls in the test and use that number. NEVER use `expect.hasAssertions()` (`vitest/prefer-expect-assertions`)
- **Describe function title:** use `describe(ClassName, ...)` with the class/function reference, not `describe('ClassName', ...)` as a string (`vitest/prefer-describe-function-title`)
- **Lowercase titles:** test and describe titles must begin with lowercase (`vitest/prefer-lowercase-title`)
- **Padding around expects:** blank line required before/after `expect` statement groups and `expect.assertions()` (`vitest/padding-around-all`, `vitest/padding-around-expect-groups`)
- **Mock type parameters:** `vi.fn()` must have type parameters — use `vi.fn<() => Promise<unknown>>()` not bare `vi.fn()` (`vitest/require-mock-type-parameters`)
- **Max expects:** maximum 5 `expect()` calls per test (`vitest/max-expects: max: 5`)
- **Consistent each for:** use `test.each` / `describe.each` for parameterized tests (`vitest/consistent-each-for`)

### Commits & Pull requests

- We use semantic commits (e.g. `feat(logic): add new listener`)
- Every commit must be signed off (`Signed-off-by` line, enforced by husky `commit-msg` hook)
- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint)
- AI assisted commits should be mentioned

## Validation

After each change, ensure the following checks pass before considering the work done:

1. `pnpm run lint:check` — ESLint
2. `pnpm run format:check` — check formatting with Biome
3. `pnpm run typecheck` — TypeScript type checking
4. `pnpm test` — run all tests with coverage

## Commands

- `pnpm test` — run all tests with coverage
- `pnpm run typecheck` — TypeScript type checking
- `pnpm run build` — build with Vite
- `pnpm run lint:check` — ESLint
- `pnpm run lint:fix` — auto-fix lint issues
- `pnpm run format:check` — check formatting with Biome
- `pnpm run format:fix` — auto-fix formatting with Biome
- `pnpm run watch` — Vite build in watch mode

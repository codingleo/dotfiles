# `.pi/bdd.json` schema

Place at the project root (preferred: `.pi/bdd.json`). Also accepted: `bdd.json`, `.bdd-tdd.json`.

```json
{
  "version": 1,
  "enabledByDefault": false,
  "projectLabel": "my-app",
  "featurePathPatterns": ["**/*.feature", "**/tests/features/**", "**/features/**/*.feature"],
  "testPathPatterns": ["**/*.test.ts", "**/tests/unit/**", "**/tests/integration/**", "**/e2e/**"],
  "implementationPathPatterns": ["**/src/**", "**/app/**", "**/lib/**", "**/packages/**/src/**"],
  "docsPathPatterns": ["**/docs/**", "**/AGENTS.md", "**/*example*map*"],
  "configPathPatterns": ["**/.pi/bdd.json", "**/package.json"],
  "alwaysAllowPathPatterns": ["**/generated/**"],
  "commands": {
    "unitTest": "bun test",
    "acceptanceTest": "bun run gherkin:test",
    "acceptanceGenerate": "bun run gherkin:generate",
    "typecheck": "bun run typecheck"
  }
}
```

## Fields

| Field | Meaning |
|---|---|
| `enabledByDefault` | If true and this file exists, session starts in `discovery` |
| `*PathPatterns` | Glob-ish patterns (`*`, `**`, dir `/` prefix) for write gates |
| `commands.unitTest` | Default for `bdd_assert_red` / `bdd_assert_green` |
| `commands.acceptanceTest` | Documented in status; run via bash or pass as `command` |
| `alwaysAllowPathPatterns` | Escape hatches for codegen output etc. |

## Create

```text
/bdd init
```

Infers commands from `package.json` scripts when possible (`test`, `gherkin:test`, `test:e2e`, `typecheck`).

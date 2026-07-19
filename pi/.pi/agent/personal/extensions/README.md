# Personal Pi extensions

TypeScript entry files in this directory are loaded by Pi through the local
package `../package.json` (`pi.extensions: ["./extensions/*.ts"]`).

Settings entry (relative to `../settings.json`):

```json
"packages": ["./personal"]
```

## Bundled: `xai-web-search.ts`

Live web research via Grok/xAI.

| Surface | Name |
|---------|------|
| Tool | `xai_web_search` |
| Commands | `/web-search <query>`, `/web-search-status` |
| Auto | Phrases like “research on the web” / “search the web” / “latest price” transform the turn + system guidelines so the model must call `xai_web_search` |

Opt out in a turn: say `no web search` / `don't search the web`.

**Auth (first match):** `XAI_API_KEY` → `GROK_API_KEY` → `~/.pi/agent/auth.json` xAI OAuth/API key.

**Optional env:**

| Var | Purpose |
|-----|--------|
| `XAI_WEB_SEARCH_MODEL` | Model override (default `grok-4-1-fast-reasoning`) |
| `XAI_API_BASE_URL` / `GROK_API_BASE_URL` | API base (default `https://api.x.ai/v1`) |
| `XAI_WEB_SEARCH_ALLOW_GROK_CLI=0` | Disable `grok` CLI fallback |

**Tests:**

```bash
cd ~/dotfiles/pi/.pi/agent/personal && bun test lib/xai-web-search
```

## Add one

```bash
bash ~/dotfiles/agents-shared/.agents/skills/pi-extension-creator/scripts/scaffold-extension.sh \
  --name my-extension --kind tool
```

Then `/reload` in Pi and commit under `~/dotfiles`.

Do not put secrets here. Machine-local state belongs outside this tree.

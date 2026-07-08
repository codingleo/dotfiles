# dotfiles

Configs for zsh, WezTerm, Neovim, and the AI coding CLIs (claude-code, codex,
opencode, pi, grok), managed with [GNU Stow](https://www.gnu.org/software/stow/).
Used on 2 MacBooks (macOS) and 1 Ubuntu PC — identical config everywhere.

## New machine

```sh
git clone git@github.com:codingleo/dotfiles.git ~/dotfiles
cd ~/dotfiles && ./install.sh
```

`install.sh` installs the tools (Homebrew bundle on macOS; apt + official
installers on Ubuntu), backs up any conflicting files to
`~/dotfiles-backup-<timestamp>/`, and symlinks every package into `$HOME`.
Idempotent — re-run it anytime. Then log in per-machine: `claude`, `codex`,
`opencode`, `pi`, and `grok` keep auth local (never in this repo).

## Layout

Each top-level directory is a stow package mirroring `$HOME`:

| Package | Target | Contents |
|---|---|---|
| `zsh` | `~/.zshrc`, `~/.zprofile`, `~/.config/zsh/` | shell config |
| `wezterm` | `~/.config/wezterm/` | terminal config |
| `nvim` | `~/.config/nvim/` | editor config + `lazy-lock.json` |
| `claude` | `~/.claude/` | settings, CLAUDE.md, agents, custom skills |
| `codex` | `~/.codex/` | config.toml, AGENTS.md, rules |
| `opencode` | `~/.config/opencode/` | configs + custom skills |
| `pi` | `~/.pi/agent/` | settings, models |
| `grok` | `~/.grok/skills/` | global skills (shared pool + claude customs via symlinks) |
| `agents-shared` | `~/.agents/` | shared skills pool + lock file |

Shared skills live once under `agents-shared` and are symlinked into `claude`,
`opencode`, and `grok`. Claude-only custom skills live under `claude` and are
also linked into `grok` so Grok Build sees the same global set without
duplicating content.

## Day to day

Configs in `$HOME` are symlinks into this repo — edit them in place, then:

```sh
cd ~/dotfiles && git add -p && git commit && git push
```

Other machines: `git pull && ./install.sh`.

### Machine-local secrets

`~/.zshrc.local` holds machine-local secret exports (API tokens, etc.). The
tracked `.zshrc` sources it when present. Create it on each machine
(`chmod 600`); it is never committed and never stowed.

## Rules

- **Never commit secrets.** Auth files, tokens, sessions, sqlite state stay
  machine-local; `.gitignore` is a second net, not the primary defense.
- New tool = new package dir + add it to `PACKAGES` in `install.sh`.

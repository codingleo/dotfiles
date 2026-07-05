# Agentic AI development helpers for zsh + WezTerm.

alias x="extract"
alias c="FORCE_COLOR=1 claude"
alias co="FORCE_COLOR=1 codex"
alias cx="FORCE_COLOR=1 codex"
alias gm="FORCE_COLOR=1 gemini"
alias oc="FORCE_COLOR=1 opencode"
alias ai="FORCE_COLOR=1 aider"

alias claude-yolo="FORCE_COLOR=1 claude --dangerously-skip-permissions"
alias codex-yolo="FORCE_COLOR=1 codex --dangerously-bypass-approvals-and-sandbox"

_ai_tool_bin() {
  emulate -L zsh
  case "$1" in
    codex) print -r -- "codex" ;;
    claude) print -r -- "claude" ;;
    gemini) print -r -- "gemini" ;;
    opencode) print -r -- "opencode" ;;
    aider) print -r -- "aider" ;;
    *) return 1 ;;
  esac
}

_ai_tool_command() {
  emulate -L zsh
  case "$1" in
    codex) print -r -- "FORCE_COLOR=1 codex" ;;
    claude) print -r -- "FORCE_COLOR=1 claude" ;;
    gemini) print -r -- "FORCE_COLOR=1 gemini" ;;
    opencode) print -r -- "FORCE_COLOR=1 opencode" ;;
    aider) print -r -- "FORCE_COLOR=1 aider" ;;
    *) return 1 ;;
  esac
}

_ai_tool_shell_command() {
  emulate -L zsh
  local tool="$1"
  local bin cmd

  bin="$(_ai_tool_bin "$tool")" || return 1
  cmd="$(_ai_tool_command "$tool")" || return 1

  if command -v "$bin" >/dev/null 2>&1; then
    print -r -- "$cmd; exec /bin/zsh -l"
  else
    print -r -- "print -P '%F{yellow}$tool is not installed on PATH%f'; exec /bin/zsh -l"
  fi
}

_ai_git_root_or_pwd() {
  emulate -L zsh
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

aictx() {
  emulate -L zsh
  local root branch package_manager

  root="$(_ai_git_root_or_pwd)"

  print -P "%F{cyan}cwd%f  $PWD"

  if git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    branch="$(git -C "$root" branch --show-current 2>/dev/null)"
    [[ -n "$branch" ]] || branch="$(git -C "$root" rev-parse --short HEAD 2>/dev/null)"
    print -P "%F{cyan}git%f  ${branch:-detached}"
    git -C "$root" status --short
  fi

  if [[ -f "$root/bun.lockb" || -f "$root/bun.lock" ]]; then
    package_manager="bun"
  elif [[ -f "$root/package-lock.json" ]]; then
    package_manager="npm"
  elif [[ -f "$root/pnpm-lock.yaml" ]]; then
    package_manager="pnpm"
  elif [[ -f "$root/yarn.lock" ]]; then
    package_manager="yarn"
  fi

  [[ -n "$package_manager" ]] && print -P "%F{cyan}package manager%f  $package_manager"

  for file in AGENTS.md CLAUDE.md README.md package.json .envrc; do
    [[ -e "$root/$file" ]] && print -P "%F{cyan}context%f  $file"
  done

  if [[ -d "$root/.beads" ]] && command -v bd >/dev/null 2>&1; then
    print -P "%F{cyan}ready beads%f"
    (cd "$root" && bd ready -n 10)
  fi
}

_aiwezterm_layout_for_pane() {
  emulate -L zsh
  local first_pane="$1"
  local root="$2"
  local codex_cmd claude_cmd runner_cmd codex_pane

  codex_cmd="$(_ai_tool_shell_command codex)"
  claude_cmd="$(_ai_tool_shell_command claude)"
  runner_cmd="print -P '%F{cyan}runner pane%f'; print 'Try: bun test, bun run typecheck, bun run lint'; exec /bin/zsh -l"

  codex_pane="$(wezterm cli split-pane --pane-id "$first_pane" --right --percent 50 --cwd "$root" -- /bin/zsh -lc "$codex_cmd")" || return 1
  wezterm cli split-pane --pane-id "$first_pane" --bottom --percent 35 --cwd "$root" -- /bin/zsh -lc "$runner_cmd" >/dev/null || return 1
  wezterm cli split-pane --pane-id "$codex_pane" --bottom --percent 50 --cwd "$root" -- /bin/zsh -lc "$claude_cmd" >/dev/null || return 1
  wezterm cli activate-pane --pane-id "$first_pane" >/dev/null 2>&1 || true
}

_aiwezterm_layout_current() {
  emulate -L zsh
  local root="${1:-$PWD}"

  [[ -n "$WEZTERM_PANE" ]] || {
    print -u2 "This helper must run inside a WezTerm pane."
    return 1
  }

  _aiwezterm_layout_for_pane "$WEZTERM_PANE" "$root"
}

aiws() {
  emulate -L zsh
  local root="${1:-$PWD}"
  local workspace_name="${2:-}"
  local first_pane bootstrap

  root="${root:A}"
  if [[ ! -d "$root" ]]; then
    print -u2 "aiws: directory not found: $root"
    return 1
  fi

  root="$(git -C "$root" rev-parse --show-toplevel 2>/dev/null || print -r -- "$root")"
  workspace_name="${workspace_name:-${root:t}}"

  if [[ -z "$WEZTERM_PANE" ]]; then
    bootstrap="source ${(q)HOME}/.zshrc; _aiwezterm_layout_current ${(q)root}; exec /bin/zsh -l"
    wezterm start --cwd "$root" --workspace "$workspace_name" -- /bin/zsh -lc "$bootstrap" >/dev/null 2>&1 &
    return 0
  fi

  first_pane="$(wezterm cli spawn --new-window --workspace "$workspace_name" --cwd "$root" -- /bin/zsh -l)" || return 1
  _aiwezterm_layout_for_pane "$first_pane" "$root"
}

aipane() {
  emulate -L zsh
  local tool="${1:-codex}"
  local cmd

  cmd="$(_ai_tool_shell_command "$tool")" || {
    print -u2 "Usage: aipane <codex|claude|gemini|opencode|aider>"
    return 2
  }

  if [[ -z "$WEZTERM_PANE" ]]; then
    print -u2 "aipane must be run inside WezTerm. Use aiws to start a WezTerm workspace."
    return 1
  fi

  wezterm cli split-pane --right --percent 50 --cwd "$PWD" -- /bin/zsh -lc "$cmd" >/dev/null
}

if (( $+functions[compdef] )); then
  compdef '_values "AI tools" codex claude gemini opencode aider' aipane
fi

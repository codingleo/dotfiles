#!/usr/bin/env bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$HOME/dotfiles-backup-$(date +%Y%m%d-%H%M%S)"
PACKAGES=(zsh wezterm nvim agents-shared claude codex opencode pi grok)

log()  { printf '\033[1;34m[dotfiles]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dotfiles] WARN:\033[0m %s\n' "$*"; }

ensure_git_repo() {
  local url="$1"
  local dir="$2"

  if [ -d "$dir/.git" ]; then
    git -C "$dir" pull --ff-only || warn "could not update $dir"
    return
  fi

  if [ -e "$dir" ]; then
    warn "$dir exists but is not a git checkout; leaving it untouched"
    return
  fi

  git clone --depth=1 "$url" "$dir" || warn "could not clone $url"
}

install_zsh_aesthetics() {
  if [ -d "$HOME/.oh-my-zsh/.git" ]; then
    git -C "$HOME/.oh-my-zsh" pull --ff-only || warn "could not update oh-my-zsh"
  elif [ -e "$HOME/.oh-my-zsh" ]; then
    warn "$HOME/.oh-my-zsh exists but is not a git checkout; leaving it untouched"
  else
    git clone --depth=1 https://github.com/ohmyzsh/ohmyzsh.git "$HOME/.oh-my-zsh" || warn "oh-my-zsh install failed"
  fi

  local custom="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"
  mkdir -p "$custom/themes" "$custom/plugins"

  ensure_git_repo https://github.com/romkatv/powerlevel10k.git "$custom/themes/powerlevel10k"
  ensure_git_repo https://github.com/zsh-users/zsh-autosuggestions.git "$custom/plugins/zsh-autosuggestions"
  ensure_git_repo https://github.com/zsh-users/zsh-syntax-highlighting.git "$custom/plugins/zsh-syntax-highlighting"
  ensure_git_repo https://github.com/zsh-users/zsh-history-substring-search.git "$custom/plugins/history-substring-search"
}

install_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    log "installing Homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  brew bundle --file="$DOTFILES_DIR/Brewfile" || warn "brew bundle had failures; continuing"
  command -v claude >/dev/null 2>&1 || curl -fsSL https://claude.ai/install.sh | bash || warn "claude install failed"
  command -v pi >/dev/null 2>&1 || npm install -g @earendil-works/pi-coding-agent || warn "pi install failed"
  command -v codex >/dev/null 2>&1 || npm install -g @openai/codex || warn "codex install failed"
  command -v grok >/dev/null 2>&1 || curl -fsSL https://x.ai/cli/install.sh | bash || warn "grok install failed"
}

install_ubuntu() {
  log "installing apt packages"
  sudo apt-get update
  xargs -a "$DOTFILES_DIR/apt-packages.txt" sudo apt-get install -y || warn "apt install had failures; continuing"

  if ! command -v wezterm >/dev/null 2>&1; then
    log "installing WezTerm from its apt repo"
    sudo install -d /etc/apt/keyrings
    curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /etc/apt/keyrings/wezterm-fury.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list >/dev/null
    sudo apt-get update && sudo apt-get install -y wezterm || warn "wezterm install failed; continuing"
  fi

  # apt's neovim is too old for this config; use the official x86_64 tarball
  if ! command -v nvim >/dev/null 2>&1; then
    log "installing Neovim from official tarball"
    curl -fsSLo /tmp/nvim-linux-x86_64.tar.gz \
      https://github.com/neovim/neovim/releases/latest/download/nvim-linux-x86_64.tar.gz
    sudo rm -rf /opt/nvim-linux-x86_64
    sudo tar -C /opt -xzf /tmp/nvim-linux-x86_64.tar.gz
    sudo ln -sf /opt/nvim-linux-x86_64/bin/nvim /usr/local/bin/nvim
  fi

  command -v claude   >/dev/null 2>&1 || curl -fsSL https://claude.ai/install.sh | bash || warn "claude install failed"
  command -v codex    >/dev/null 2>&1 || sudo npm install -g @openai/codex || warn "codex install failed"
  command -v opencode >/dev/null 2>&1 || curl -fsSL https://opencode.ai/install | bash || warn "opencode install failed"
  command -v pi       >/dev/null 2>&1 || sudo npm install -g @earendil-works/pi-coding-agent || warn "pi install failed"
  command -v grok     >/dev/null 2>&1 || curl -fsSL https://x.ai/cli/install.sh | bash || warn "grok install failed"
  command -v rtk >/dev/null 2>&1 || warn "rtk not found — zsh/claude hooks reference it (Homebrew on Linux: brew install rtk)"
  command -v bd  >/dev/null 2>&1 || warn "bd (beads) not found — claude hooks reference it (brew install beads)"
}

# Move any real file (or foreign symlink) that a package wants to own into BACKUP_DIR.
backup_conflicts() {
  local pkg="$1"
  while IFS= read -r rel; do
    local target="$HOME/$rel"
    if [ -e "$target" ] || [ -L "$target" ]; then
      case "$(readlink "$target" 2>/dev/null || true)" in
        *"dotfiles/$pkg"*) ;;  # already our symlink
        *)
          mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
          mv "$target" "$BACKUP_DIR/$rel"
          warn "backed up $target -> $BACKUP_DIR/$rel"
          ;;
      esac
    fi
  done < <(cd "$DOTFILES_DIR/$pkg" && find . \( -type f -o -type l \) | sed 's|^\./||')
}

main() {
  case "$(uname -s)" in
    Darwin) install_macos ;;
    Linux)  install_ubuntu ;;
    *) warn "unsupported OS $(uname -s); skipping tool install" ;;
  esac
  install_zsh_aesthetics

  command -v stow >/dev/null 2>&1 || { echo "FATAL: stow not installed" >&2; exit 1; }

  for pkg in "${PACKAGES[@]}"; do
    backup_conflicts "$pkg"
    stow --no-folding --restow -d "$DOTFILES_DIR" -t "$HOME" "$pkg"
    log "stowed $pkg"
  done

  [ -d "$BACKUP_DIR" ] && warn "pre-existing files were backed up to $BACKUP_DIR"
  log "done — open a new shell to pick up zsh config"
}

main "$@"

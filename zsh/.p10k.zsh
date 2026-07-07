# ~/.p10k.zsh — vibrant Powerlevel10k config (Catppuccin Mocha).
# Style: flat colored blocks that sit flush and merge into one continuous bar
# (no powerline arrows or protruding tails). No glyph bytes live in this file.
# Re-run `p10k configure` to regenerate interactively.

'builtin' 'local' '-a' 'p10k_config_opts'
[[ ! -o 'aliases'         ]] || p10k_config_opts+=('aliases')
[[ ! -o 'sh_glob'         ]] || p10k_config_opts+=('sh_glob')
[[ ! -o 'no_brace_expand' ]] || p10k_config_opts+=('no_brace_expand')
'builtin' 'setopt' 'no_aliases' 'no_sh_glob' 'brace_expand'

() {
  emulate -L zsh -o extended_glob
  unset -m 'POWERLEVEL9K_*'
  autoload -Uz is-at-least && is-at-least 5.1 || return

  # ---- Catppuccin Mocha palette (hex; WezTerm is truecolor) -----------------
  local base='#1e1e2e' mantle='#181825' surface0='#313244' surface1='#45475a'
  local text='#cdd6f4' subtext='#a6adc8'
  local blue='#89b4fa' sky='#89dceb' sapphire='#74c7ec' teal='#94e2d5'
  local green='#a6e3a1' yellow='#f9e2af' peach='#fab387' red='#f38ba8'
  local mauve='#cba6f7' pink='#f5c2e7' lavender='#b4befe'

  # ---- Segments -------------------------------------------------------------
  typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(
    os_icon dir vcs
    newline
    prompt_char
  )
  typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(
    status command_execution_time background_jobs
    node_version python_version go_version rust_version
    time
  )

  typeset -g POWERLEVEL9K_MODE=nerdfont-complete
  typeset -g POWERLEVEL9K_ICON_PADDING=moderate
  typeset -g POWERLEVEL9K_PROMPT_ADD_NEWLINE=true
  typeset -g POWERLEVEL9K_BACKGROUND=$surface0   # default segment bg

  # ---- Flat style: NO separators, NO outer caps -----------------------------
  # Every separator/cap set to empty => blocks butt together with a crisp color
  # boundary and flat edges. One clean bar, nothing pokes out.
  typeset -g POWERLEVEL9K_LEFT_SEGMENT_SEPARATOR=''
  typeset -g POWERLEVEL9K_RIGHT_SEGMENT_SEPARATOR=''
  typeset -g POWERLEVEL9K_LEFT_SUBSEGMENT_SEPARATOR=''
  typeset -g POWERLEVEL9K_RIGHT_SUBSEGMENT_SEPARATOR=''
  typeset -g POWERLEVEL9K_LEFT_PROMPT_FIRST_SEGMENT_START_SYMBOL=''
  typeset -g POWERLEVEL9K_LEFT_PROMPT_LAST_SEGMENT_END_SYMBOL=''
  typeset -g POWERLEVEL9K_RIGHT_PROMPT_FIRST_SEGMENT_START_SYMBOL=''
  typeset -g POWERLEVEL9K_RIGHT_PROMPT_LAST_SEGMENT_END_SYMBOL=''
  # Keep one space of padding inside each block so text isn't cramped.
  typeset -g POWERLEVEL9K_LEFT_LEFT_WHITESPACE=' '
  typeset -g POWERLEVEL9K_LEFT_RIGHT_WHITESPACE=' '
  typeset -g POWERLEVEL9K_RIGHT_LEFT_WHITESPACE=' '
  typeset -g POWERLEVEL9K_RIGHT_RIGHT_WHITESPACE=' '

  # ---- Prompt char (clean colored arrow alone on line 2) --------------------
  typeset -g POWERLEVEL9K_PROMPT_CHAR_BACKGROUND=
  typeset -g POWERLEVEL9K_PROMPT_CHAR_OK_{VIINS,VICMD,VIVIS,VIOWR}_FOREGROUND=$green
  typeset -g POWERLEVEL9K_PROMPT_CHAR_ERROR_{VIINS,VICMD,VIVIS,VIOWR}_FOREGROUND=$red
  typeset -g POWERLEVEL9K_PROMPT_CHAR_{OK,ERROR}_VIINS_CONTENT_EXPANSION='❯'
  typeset -g POWERLEVEL9K_PROMPT_CHAR_{OK,ERROR}_VICMD_CONTENT_EXPANSION='❮'
  typeset -g POWERLEVEL9K_PROMPT_CHAR_{OK,ERROR}_VIVIS_CONTENT_EXPANSION='V'
  typeset -g POWERLEVEL9K_PROMPT_CHAR_LEFT_{LEFT,RIGHT}_WHITESPACE=''

  # ---- OS icon (mauve block) ------------------------------------------------
  typeset -g POWERLEVEL9K_OS_ICON_BACKGROUND=$mauve
  typeset -g POWERLEVEL9K_OS_ICON_FOREGROUND=$base

  # ---- Directory (blue block, dark text, bold anchors) ----------------------
  typeset -g POWERLEVEL9K_DIR_BACKGROUND=$blue
  typeset -g POWERLEVEL9K_DIR_FOREGROUND=$base
  typeset -g POWERLEVEL9K_DIR_SHORTENED_FOREGROUND=$mantle
  typeset -g POWERLEVEL9K_DIR_ANCHOR_FOREGROUND=$base
  typeset -g POWERLEVEL9K_DIR_ANCHOR_BOLD=true
  typeset -g POWERLEVEL9K_SHORTEN_STRATEGY=truncate_to_unique
  typeset -g POWERLEVEL9K_SHORTEN_DELIMITER=
  typeset -g POWERLEVEL9K_DIR_MAX_LENGTH=40
  typeset -g POWERLEVEL9K_DIR_SHOW_WRITABLE=v3

  # ---- Git (color-shifts by state) ------------------------------------------
  typeset -g POWERLEVEL9K_VCS_CLEAN_BACKGROUND=$green
  typeset -g POWERLEVEL9K_VCS_CLEAN_FOREGROUND=$base
  typeset -g POWERLEVEL9K_VCS_MODIFIED_BACKGROUND=$yellow
  typeset -g POWERLEVEL9K_VCS_MODIFIED_FOREGROUND=$base
  typeset -g POWERLEVEL9K_VCS_UNTRACKED_BACKGROUND=$sky
  typeset -g POWERLEVEL9K_VCS_UNTRACKED_FOREGROUND=$base
  typeset -g POWERLEVEL9K_VCS_CONFLICTED_BACKGROUND=$red
  typeset -g POWERLEVEL9K_VCS_CONFLICTED_FOREGROUND=$base
  typeset -g POWERLEVEL9K_VCS_LOADING_BACKGROUND=$surface1
  typeset -g POWERLEVEL9K_VCS_LOADING_FOREGROUND=$subtext
  typeset -g POWERLEVEL9K_VCS_UNTRACKED_ICON='?'

  # ---- Status ---------------------------------------------------------------
  typeset -g POWERLEVEL9K_STATUS_OK=false
  typeset -g POWERLEVEL9K_STATUS_ERROR=true
  typeset -g POWERLEVEL9K_STATUS_ERROR_BACKGROUND=$red
  typeset -g POWERLEVEL9K_STATUS_ERROR_FOREGROUND=$base
  typeset -g POWERLEVEL9K_STATUS_ERROR_VISUAL_IDENTIFIER_EXPANSION='✘'
  typeset -g POWERLEVEL9K_STATUS_ERROR_SIGNAL_BACKGROUND=$red
  typeset -g POWERLEVEL9K_STATUS_ERROR_SIGNAL_FOREGROUND=$base
  typeset -g POWERLEVEL9K_STATUS_VERBOSE_SIGNAME=false

  # ---- Command execution time (peach block) ---------------------------------
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_THRESHOLD=3
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_PRECISION=1
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_BACKGROUND=$peach
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_FOREGROUND=$base
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_PREFIX='took '

  # ---- Background jobs ------------------------------------------------------
  typeset -g POWERLEVEL9K_BACKGROUND_JOBS_BACKGROUND=$surface1
  typeset -g POWERLEVEL9K_BACKGROUND_JOBS_FOREGROUND=$teal

  # ---- Language versions (only inside relevant projects) --------------------
  typeset -g POWERLEVEL9K_NODE_VERSION_BACKGROUND=$green
  typeset -g POWERLEVEL9K_NODE_VERSION_FOREGROUND=$base
  typeset -g POWERLEVEL9K_NODE_VERSION_PROJECT_ONLY=true
  typeset -g POWERLEVEL9K_PYTHON_VERSION_BACKGROUND=$sapphire
  typeset -g POWERLEVEL9K_PYTHON_VERSION_FOREGROUND=$base
  typeset -g POWERLEVEL9K_PYTHON_VERSION_PROJECT_ONLY=true
  typeset -g POWERLEVEL9K_GO_VERSION_BACKGROUND=$sky
  typeset -g POWERLEVEL9K_GO_VERSION_FOREGROUND=$base
  typeset -g POWERLEVEL9K_GO_VERSION_PROJECT_ONLY=true
  typeset -g POWERLEVEL9K_RUST_VERSION_BACKGROUND=$peach
  typeset -g POWERLEVEL9K_RUST_VERSION_FOREGROUND=$base
  typeset -g POWERLEVEL9K_RUST_VERSION_PROJECT_ONLY=true

  # ---- Time (dark block, right end) -----------------------------------------
  typeset -g POWERLEVEL9K_TIME_BACKGROUND=$surface1
  typeset -g POWERLEVEL9K_TIME_FOREGROUND=$text
  typeset -g POWERLEVEL9K_TIME_FORMAT='%D{%H:%M:%S}'
  typeset -g POWERLEVEL9K_TIME_UPDATE_ON_COMMAND=false

  # ---- Behaviour ------------------------------------------------------------
  typeset -g POWERLEVEL9K_TRANSIENT_PROMPT=always
  typeset -g POWERLEVEL9K_INSTANT_PROMPT=verbose
  typeset -g POWERLEVEL9K_DISABLE_HOT_RELOAD=false

  (( ! $+functions[p10k] )) || p10k reload
}

typeset -g POWERLEVEL9K_CONFIG_FILE=${${(%):-%x}:a}

(( ${#p10k_config_opts} )) && setopt ${p10k_config_opts[@]}
'builtin' 'unset' 'p10k_config_opts'

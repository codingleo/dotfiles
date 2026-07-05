local wezterm = require("wezterm")
local act = wezterm.action

local config = wezterm.config_builder()

config.default_prog = { "/bin/zsh", "-l" }

config.font = wezterm.font_with_fallback({
  "JetBrainsMono Nerd Font",
  "JetBrains Mono",
  "Menlo",
})
config.font_size = 13.5
config.line_height = 1.08

config.colors = {
  foreground = "#d6deeb",
  background = "#101216",
  cursor_bg = "#7dd3fc",
  cursor_border = "#7dd3fc",
  cursor_fg = "#101216",
  selection_bg = "#334155",
  selection_fg = "#f8fafc",
  scrollbar_thumb = "#475569",
  split = "#334155",
  ansi = {
    "#151820",
    "#f87171",
    "#86efac",
    "#fde68a",
    "#93c5fd",
    "#c4b5fd",
    "#67e8f9",
    "#d6deeb",
  },
  brights = {
    "#475569",
    "#fca5a5",
    "#bbf7d0",
    "#fef3c7",
    "#bfdbfe",
    "#ddd6fe",
    "#a5f3fc",
    "#f8fafc",
  },
  tab_bar = {
    background = "#0b0d12",
    active_tab = {
      bg_color = "#1e293b",
      fg_color = "#f8fafc",
      intensity = "Bold",
    },
    inactive_tab = {
      bg_color = "#111827",
      fg_color = "#94a3b8",
    },
    inactive_tab_hover = {
      bg_color = "#1f2937",
      fg_color = "#e2e8f0",
    },
    new_tab = {
      bg_color = "#111827",
      fg_color = "#94a3b8",
    },
    new_tab_hover = {
      bg_color = "#1f2937",
      fg_color = "#e2e8f0",
    },
  },
}

config.window_background_opacity = 0.98

local is_mac = wezterm.target_triple:find("apple") ~= nil
if is_mac then
  config.macos_window_background_blur = 18
end

config.window_padding = {
  left = 8,
  right = 8,
  top = 6,
  bottom = 4,
}

config.initial_cols = 150
config.initial_rows = 42
config.scrollback_lines = 100000
config.enable_scroll_bar = true
config.window_close_confirmation = "AlwaysPrompt"
config.adjust_window_size_when_changing_font_size = false

config.hide_tab_bar_if_only_one_tab = false
config.use_fancy_tab_bar = false
config.tab_max_width = 32

config.audible_bell = "Disabled"
config.check_for_updates = false
config.automatically_reload_config = true
config.set_environment_variables = {
  COLORTERM = "truecolor",
}

config.launch_menu = {
  {
    label = "Codex",
    args = { "/bin/zsh", "-lc", "FORCE_COLOR=1 codex; exec /bin/zsh -l" },
  },
  {
    label = "Claude",
    args = { "/bin/zsh", "-lc", "FORCE_COLOR=1 claude; exec /bin/zsh -l" },
  },
  {
    label = "Gemini",
    args = { "/bin/zsh", "-lc", "FORCE_COLOR=1 gemini; exec /bin/zsh -l" },
  },
  {
    label = "OpenCode",
    args = { "/bin/zsh", "-lc", "FORCE_COLOR=1 opencode; exec /bin/zsh -l" },
  },
  {
    label = "Aider",
    args = { "/bin/zsh", "-lc", "FORCE_COLOR=1 aider; exec /bin/zsh -l" },
  },
}

config.leader = {
  key = "Space",
  mods = "CTRL",
  timeout_milliseconds = 1000,
}

config.keys = {
  {
    key = "|",
    mods = "LEADER|SHIFT",
    action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }),
  },
  {
    key = "\\",
    mods = "LEADER",
    action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }),
  },
  {
    key = "-",
    mods = "LEADER",
    action = act.SplitVertical({ domain = "CurrentPaneDomain" }),
  },
  {
    key = "h",
    mods = "CMD|ALT",
    action = act.ActivatePaneDirection("Left"),
  },
  {
    key = "j",
    mods = "CMD|ALT",
    action = act.ActivatePaneDirection("Down"),
  },
  {
    key = "k",
    mods = "CMD|ALT",
    action = act.ActivatePaneDirection("Up"),
  },
  {
    key = "l",
    mods = "CMD|ALT",
    action = act.ActivatePaneDirection("Right"),
  },
  {
    key = "h",
    mods = "CMD|ALT|SHIFT",
    action = act.AdjustPaneSize({ "Left", 5 }),
  },
  {
    key = "j",
    mods = "CMD|ALT|SHIFT",
    action = act.AdjustPaneSize({ "Down", 3 }),
  },
  {
    key = "k",
    mods = "CMD|ALT|SHIFT",
    action = act.AdjustPaneSize({ "Up", 3 }),
  },
  {
    key = "l",
    mods = "CMD|ALT|SHIFT",
    action = act.AdjustPaneSize({ "Right", 5 }),
  },
  {
    key = "Enter",
    mods = "CMD|SHIFT",
    action = act.TogglePaneZoomState,
  },
  {
    key = "Enter",
    mods = "SHIFT",
    action = act.SendString("\n"),
  },
  {
    key = "P",
    mods = "CMD|SHIFT",
    action = act.ActivateCommandPalette,
  },
  {
    key = "W",
    mods = "CMD|SHIFT",
    action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }),
  },
  {
    key = "L",
    mods = "CMD|SHIFT",
    action = act.ShowLauncherArgs({ flags = "FUZZY|LAUNCH_MENU_ITEMS" }),
  },
}

local function basename(path)
  return path:gsub("/*$", ""):match("([^/]+)$") or path
end

wezterm.on("format-tab-title", function(tab)
  local title = tab.tab_title
  if title == "" then
    title = tab.active_pane.title
  end

  return {
    { Text = " " .. tab.tab_index + 1 .. ":" .. title .. " " },
  }
end)

wezterm.on("update-right-status", function(window, pane)
  local cwd = pane:get_current_working_dir()
  local cwd_label = ""

  if cwd then
    cwd_label = basename(tostring(cwd):gsub("^file://[^/]*", ""))
  end

  window:set_right_status(wezterm.format({
    { Foreground = { Color = "#94a3b8" } },
    { Text = " " .. window:active_workspace() },
    { Text = cwd_label ~= "" and (" | " .. cwd_label) or "" },
    { Text = " | " .. wezterm.strftime("%H:%M") .. " " },
  }))
end)

return config

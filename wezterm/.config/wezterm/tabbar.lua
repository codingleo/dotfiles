-- ~/.config/wezterm/tabbar.lua
-- A compact, iconed tab bar + status line themed for Catppuccin Mocha.

local wezterm = require("wezterm")

local M = {}

-- Catppuccin Mocha palette
local c = {
	base = "#1e1e2e",
	mantle = "#181825",
	surface0 = "#313244",
	surface1 = "#45475a",
	text = "#cdd6f4",
	subtext = "#a6adc8",
	overlay = "#6c7086",
	mauve = "#cba6f7",
	blue = "#89b4fa",
	sapphire = "#74c7ec",
	green = "#a6e3a1",
	peach = "#fab387",
	red = "#f38ba8",
	yellow = "#f9e2af",
}

-- Map common process names to Nerd Font icons for the tab title.
local process_icons = {
	["nvim"] = wezterm.nerdfonts.custom_vim,
	["vim"] = wezterm.nerdfonts.custom_vim,
	["node"] = wezterm.nerdfonts.mdi_hexagon,
	["python"] = wezterm.nerdfonts.dev_python,
	["python3"] = wezterm.nerdfonts.dev_python,
	["cargo"] = wezterm.nerdfonts.dev_rust,
	["rustc"] = wezterm.nerdfonts.dev_rust,
	["go"] = wezterm.nerdfonts.mdi_language_go,
	["git"] = wezterm.nerdfonts.dev_git,
	["lazygit"] = wezterm.nerdfonts.dev_git,
	["docker"] = wezterm.nerdfonts.dev_docker,
	["ssh"] = wezterm.nerdfonts.md_ssh,
	["bash"] = wezterm.nerdfonts.cod_terminal_bash,
	["zsh"] = wezterm.nerdfonts.dev_terminal,
	["fish"] = wezterm.nerdfonts.dev_terminal,
	["claude"] = wezterm.nerdfonts.md_robot,
}

local function basename(s)
	return string.gsub(s or "", "(.*[/\\])(.*)", "%2")
end

local function tab_title(tab)
	local proc = basename(tab.active_pane.foreground_process_name)
	local icon = process_icons[proc] or wezterm.nerdfonts.cod_terminal
	-- Prefer an explicitly set tab title, else the process name.
	local title = tab.tab_title
	if title == nil or #title == 0 then
		title = proc ~= "" and proc or "shell"
	end
	return string.format(" %s  %s ", icon, title)
end

function M.setup(config)
	config.use_fancy_tab_bar = false
	config.tab_bar_at_bottom = false
	config.hide_tab_bar_if_only_one_tab = false
	config.show_new_tab_button_in_tab_bar = false
	config.tab_max_width = 32

	config.colors = {
		tab_bar = {
			background = c.mantle,
			new_tab = { bg_color = c.mantle, fg_color = c.overlay },
		},
	}

	-- Flat tab blocks (no powerline arrows). Each tab is a clean colored block;
	-- a thin gap in the tab-bar background keeps adjacent tabs distinct without
	-- any protruding "tail" glyphs.
	wezterm.on("format-tab-title", function(tab, tabs, panes, cfg, hover, max_width)
		local title = tab_title(tab)
		local active = tab.is_active
		local fg = active and c.base or c.subtext
		local bg = active and c.mauve or c.surface0
		if hover and not active then
			bg = c.surface1
			fg = c.text
		end
		return {
			-- leading gap in the bar background = flat separation, no arrow
			{ Background = { Color = c.mantle } },
			{ Foreground = { Color = c.mantle } },
			{ Text = " " },
			-- the tab block itself
			{ Background = { Color = bg } },
			{ Foreground = { Color = fg } },
			{ Attribute = { Intensity = active and "Bold" or "Normal" } },
			{ Text = title },
		}
	end)

	-- Right status: workspace • cwd • git branch • time
	wezterm.on("update-status", function(window, pane)
		local cells = {}

		local cwd_uri = pane:get_current_working_dir()
		if cwd_uri then
			local cwd = cwd_uri.file_path or tostring(cwd_uri)
			cwd = basename(cwd:gsub("/$", ""))
			table.insert(cells, { c.blue, wezterm.nerdfonts.cod_folder .. "  " .. cwd })
		end

		local ok, branch = pcall(function()
			local success, stdout = wezterm.run_child_process({
				"git",
				"-C",
				(cwd_uri and (cwd_uri.file_path or "")) or ".",
				"rev-parse",
				"--abbrev-ref",
				"HEAD",
			})
			if success then
				return (stdout:gsub("%s+$", ""))
			end
			return nil
		end)
		if ok and branch and #branch > 0 then
			table.insert(cells, { c.green, wezterm.nerdfonts.dev_git_branch .. "  " .. branch })
		end

		table.insert(cells, { c.peach, wezterm.nerdfonts.md_clock_outline .. "  " .. wezterm.strftime("%H:%M") })

		local elements = {}
		for i, cell in ipairs(cells) do
			table.insert(elements, { Foreground = { Color = cell[1] } })
			table.insert(elements, { Text = cell[2] })
			if i < #cells then
				table.insert(elements, { Foreground = { Color = c.overlay } })
				table.insert(elements, { Text = "   " })
			end
		end
		table.insert(elements, { Text = "  " })
		window:set_right_status(wezterm.format(elements))

		-- Left status: leader indicator + active key table (e.g. resize mode)
		local left = {}
		if window:leader_is_active() then
			table.insert(left, { Foreground = { Color = c.base } })
			table.insert(left, { Background = { Color = c.yellow } })
			table.insert(left, { Text = "  " .. wezterm.nerdfonts.md_keyboard .. " LEADER  " })
		end
		local kt = window:active_key_table()
		if kt then
			table.insert(left, { Foreground = { Color = c.base } })
			table.insert(left, { Background = { Color = c.sapphire } })
			table.insert(left, { Text = "  " .. kt:upper() .. "  " })
		end
		window:set_left_status(wezterm.format(left))
	end)
end

return M

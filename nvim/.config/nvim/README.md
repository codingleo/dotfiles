# Neovim Configuration

This repository contains a self-contained Neovim setup driven by [`lazy.nvim`](https://github.com/folke/lazy.nvim). It focuses on TypeScript/JavaScript and Rust development while keeping the configuration minimal and declarative so it is easy to understand, fork, or extend.

## What You Get

- Catppuccin mocha theme with true-color and transparent toggles ready.
- Treesitter parsers for TS/JS/TSX, Rust, Lua, JSON, HTML, and CSS with syntax-aware highlighting and indentation.
- LSP support via `mason.nvim`/`mason-lspconfig.nvim`, pre-installing `tsserver` and `rust_analyzer`, plus completion through `nvim-cmp`/`LuaSnip`.
- Telescope for fuzzy finding files, live ripgrep, and buffer switching (`<leader>ff`, `<leader>fg`, `<leader>fb`).
- Trouble for quick diagnostics review (`:TroubleToggle`) and Harpoon for frequently visited files (`<leader>a` to mark, `<leader>h` to open the list).
- Sensible defaults: relative numbers, clipboard integration, smart indentation, filetype-based shiftwidth (2 spaces for web files, 4 for Rust), etc.

## Getting Started

1. Ensure Neovim 0.9+ with LuaJIT is installed.
2. Backup or remove any existing `~/.config/nvim`.
3. Clone this repository into `~/.config/nvim`:

   ```bash
   git clone <this repo> ~/.config/nvim
   ```

4. Start Neovim. On the first launch, `lazy.nvim` bootstraps itself and installs the plugins listed in `init.lua`. The generated plugin versions are tracked in `lazy-lock.json`.

To install/upgrade plugins later, run `:Lazy sync` inside Neovim.

## Key Features & Customization

- **Leader Key**: Space is the leader for all custom mappings.
- **LSP keymaps**: `gd` jump to definition, `K` hover, `<leader>rn` rename, `<leader>ca` code actions once an LSP client is attached.
- **Format width**: `autocmd FileType` hooks set `shiftwidth` to 2 for JS/TS/JSON/TSX and 4 for Rust, but you can add more patterns in `init.lua`.
- **Adding plugins**: Extend the array passed to `require("lazy").setup({...})` in `init.lua`. Each plugin entry can define its own `config`, `keys`, `dependencies`, and `build` instructions.
- **Color scheme tweaks**: Adjust the `catppuccin` `flavour` (e.g., `latte`, `frappe`, `macchiato`) or enable `transparent_background` in the Catppuccin config block.

## Repo Layout

```
├── init.lua        # Main Neovim configuration (plugins, options, keymaps)
├── lazy-lock.json  # Lazy's pinned plugin versions
└── LICENSE         # Project license (MIT)
```

Feel free to fork and adapt the configuration for your workflow. Contributions and suggestions are welcome!

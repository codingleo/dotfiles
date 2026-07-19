# Personal Pi extensions

TypeScript entry files in this directory are loaded by Pi through the local
package `../package.json` (`pi.extensions: ["./extensions/*.ts"]`).

Settings entry (relative to `../settings.json`):

```json
"packages": ["./personal"]
```

## Add one

```bash
bash ~/dotfiles/agents-shared/.agents/skills/pi-extension-creator/scripts/scaffold-extension.sh \
  --name my-extension --kind tool
```

Then `/reload` in Pi and commit under `~/dotfiles`.

Do not put secrets here. Machine-local state belongs outside this tree.

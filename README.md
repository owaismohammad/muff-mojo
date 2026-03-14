# MuffMojo

Current layout:

- root manifest and popup files are the packaged Chrome extension entrypoints
- `src/muffmojo/data/` contains the emoji dataset
- `src/muffmojo/utils/` contains the shared runtime helpers
- `src/muffmojo/website/` contains the standalone website
- `src/muffmojo/scripts/` contains local maintenance scripts
- `src/muffmojo/test-fixtures/` contains manual browser fixtures

## Current extension behavior

- Auto-reacquires likely chat composers when chat UIs swap, including Instagram-style DM layouts
- Uses fuzzy `:emoji` lookup in inputs, textareas, contenteditable editors, and role textboxes
- Lets you trigger a new shortcode immediately after an inserted emoji
- Replaces the active shortcode with the last used emoji when you press `ArrowUp`

## Packaging

Load the repo root as the unpacked extension.

If you want a clean deployable folder, build one with:

```powershell
powershell -ExecutionPolicy Bypass -File src\muffmojo\scripts\package-extension.ps1
```

Then load `dist/extension`.

To refresh the bundled emoji dataset:

```bash
node src/muffmojo/scripts/build-emoji-dataset.mjs
```

To run the lightweight search smoke test:

```bash
node src/muffmojo/scripts/run-smoke-tests.mjs
```

## Website

Website files live in:

- `src/muffmojo/website/index.html`
- `src/muffmojo/website/styles.css`

The popup opens that bundled website page via the extension package.

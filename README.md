# MuffMojo

MuffMojo is a Manifest V3 Chrome extension that injects emoji suggestions directly into modern chat composers using `:emoji` style commands.

## What changed

- Automatically reacquires and focuses the most likely visible chat composer when chats swap
- Uses a bundled emoji dataset with fuzzy matching and keyboard-first selection
- Ships a redesigned popup and a standalone landing page in `website/`
- Cleans out the old legacy content scripts and extra generated docs

## Package the extension

The extension is self-contained. Runtime emoji lookup uses `data/emoji-dataset.js`, so the packaged build does not fetch data from the network.

If you want to refresh the bundled dataset before packaging:

```bash
node scripts/build-emoji-dataset.mjs
```

Then load the folder as an unpacked extension or zip the repo contents for distribution.

## Website

The landing page lives in `website/index.html` and `website/styles.css`. From the popup, the "Open product page" action opens that bundled page inside the extension.

## Dataset source

- Upstream source: [github/gemoji](https://github.com/github/gemoji)
- Vendored source file: `data/emoji-source-gemoji.json`
- License: MIT

## Manual smoke page

Open `test-fixtures/manual-smoke.html` after loading the unpacked extension to test the input, textarea, contenteditable, and role textbox flows.

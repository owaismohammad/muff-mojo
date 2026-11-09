# Muff-Mojo 🧁

**Sprinkle some fun on your chats 🍩**

Type a word and get the emoji. Muff-Mojo shows emoji suggestions right above your cursor on **WhatsApp Web** and **Instagram**.

## How it works

| You type | You get |
| --- | --- |
| `love` | 😍 ❤️ 💑 |
| `fire` | 🔥 |
| `:lau` (colon search) | 😂 👏 … |

- **Type a word** like `love`, `pizza` or `skull`. Matching emojis pop up above it.
- **↑** moves to the next emoji, **↓** back. **Tab** (or a click) to insert. The word turns into the emoji.
- **`:` + letters** searches all ~1,900 emojis by name or keyword (`:hamsa` → 🪬). **Enter** also inserts in this mode.
- **Every Unicode emoji** up to Emoji 17 is included: flags (`japan` → 🇯🇵), objects, symbols, and skin tones (set yours in Settings).
- **Esc** hides the picker for that word. **Enter** still sends your message as usual.

Words are case-insensitive, and `thumbs_up`, `thumbsUp` and `thumbsup` all work.

While you type normally, the picker only opens for hand-picked trigger words, one-word emoji names (`pizza`, `rocket`), and country names. Everyday words like "like" or "time" don't open it. Every other keyword works through `:` search.

## The popup

- **Emojis**: search the dictionary or browse by category. Hover to see the trigger words, click to copy.
- **How to use**: a quick guide.
- **Settings**: turn it off everywhere, per site (WhatsApp / Instagram), switch off plain-word suggestions (`:search` only), stop the automatic space after emojis, pick light/dark, and choose a skin tone.

## Install (developer mode)

1. `git clone https://github.com/owaismohammad/MuffMojo.git`
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `MuffMojo` folder.
4. Open WhatsApp Web or Instagram and start typing.

## Project layout

```
manifest.json     MV3 manifest
emoji-data.js     every Unicode emoji (generated — don't edit; see below)
emojis.js         dictionary runtime: lookup, search, skin tones (shared by content script and popup)
tools/            emoji data build script, hand-picked trigger words, vendored source data
content.js        in-page suggestion picker
popup.html/css/js toolbar popup
icons/            toolbar and store icons
dev/playground.html  local test page (serve the repo root, e.g. `python -m http.server`)
dev/lexical.html     same, with a real Lexical editor (what WhatsApp Web uses)
```

### Emoji data

`emoji-data.js` is generated from two MIT-licensed datasets in `tools/vendor/`
([unicode-emoji-json](https://github.com/muan/unicode-emoji-json) for names, categories and skin-tone
support, and [emojilib](https://github.com/muan/emojilib) for keywords), plus our own trigger words in
`tools/curated.json`. Emojis listed there rank first for their words.

To add or change trigger words, edit `tools/curated.json` (first word = display name), then rebuild:

```bash
node tools/build-emoji-data.mjs
```

```json
["🧋", "boba", "bubble_tea", "milk_tea"]
```

To pick up a new Unicode release, replace the files in `tools/vendor/` with newer versions of those
packages, update the file names at the top of `tools/build-emoji-data.mjs`, and rebuild.

## What's new in 3.0

- New picker: several matches per word, keyboard navigation, light/dark themes, stays put while you scroll.
- New popup with a searchable dictionary, recently used emojis, and settings.
- All ~1,900 Unicode emojis (up to Emoji 17), with flags and skin tones.
- Emojis go in through the site's own editor, so the message you send matches what you see and undo works.
- Fixed: text after the cursor was deleted when an emoji was inserted.
- Fixed: clicking around the page stacked up duplicate tooltips and listeners.
- Fixed: the ↑ key was blocked even when no emoji was showing.
- Fixed: duplicate words overriding each other (`love`, `kiss`, `wave`, `moon`, …).
- Fixed: the tooltip was mispositioned after scrolling or in an empty box.
- Fixed: the invalid manifest icon key and missing icon file.

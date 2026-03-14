import fs from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const sourcePath = path.join(workspaceRoot, "data", "emoji-source-gemoji.json");
const outputPath = path.join(workspaceRoot, "data", "emoji-dataset.js");

const stopWords = new Set([
  "a",
  "an",
  "and",
  "face",
  "flag",
  "for",
  "in",
  "of",
  "on",
  "the",
  "with",
]);

const extraKeywordsByEmoji = {
  "😂": ["cry", "crying", "haha", "laugh", "laughing", "lol", "tears"],
  "🔥": ["fire", "lit", "hot"],
  "❤️": ["heart", "love"],
  "❤": ["heart", "love"],
  "😍": ["heart", "love"],
  "🥺": ["begging", "please", "pleading"],
  "😭": ["cry", "crying", "tears", "sob"],
  "🤣": ["haha", "laugh", "laughing", "lol", "rofl"],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractDescriptionKeywords(description) {
  return description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function buildEntry(entry) {
  const shortcodes = unique(entry.aliases || []);
  const keywords = unique([
    ...(entry.tags || []),
    ...extractDescriptionKeywords(entry.description || ""),
    ...(extraKeywordsByEmoji[entry.emoji] || []),
  ]);

  return {
    emoji: entry.emoji,
    shortcodes,
    keywords,
  };
}

function toJavaScriptModule(dataset) {
  const banner =
    "/* Generated from github/gemoji (MIT). Run `node scripts/build-emoji-dataset.mjs` to refresh. */";

  return `${banner}
(function (global) {
  const app = global.MuffMojo = global.MuffMojo || {};
  app.emojiData = ${JSON.stringify(dataset)};
  app.emojiSource = {
    name: "github/gemoji",
    license: "MIT",
    sourcePath: "data/emoji-source-gemoji.json"
  };
})(globalThis);
`;
}

async function main() {
  const rawSource = await fs.readFile(sourcePath, "utf8");
  const source = JSON.parse(rawSource.replace(/^\uFEFF/, ""));
  const dataset = source
    .map(buildEntry)
    .filter((entry) => entry.emoji && entry.shortcodes.length > 0);

  await fs.writeFile(outputPath, toJavaScriptModule(dataset), "utf8");
  process.stdout.write(`Wrote ${dataset.length} emoji entries to ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});

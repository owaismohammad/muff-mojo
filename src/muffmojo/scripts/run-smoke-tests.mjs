import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const workspaceRoot = process.cwd();

async function loadScript(relativePath, context) {
  const source = await fs.readFile(path.join(workspaceRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

async function main() {
  const sandbox = {
    console,
    globalThis: {},
  };

  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);

  await loadScript("data/emoji-dataset.js", context);
  await loadScript("utils/fuzzySearch.js", context);
  await loadScript("utils/emojiDataset.js", context);

  const app = sandbox.MuffMojo;
  const dataset = app.emojiDataset.getDataset();
  const search = app.fuzzySearch.searchEmojis;

  assert.ok(dataset.length > 1000, "Expected a comprehensive emoji dataset");
  assert.equal(search("s", dataset, 5).length, 5, "Single-letter search should still return raw results when called directly");

  const smileResults = search("smil", dataset, 5).map((entry) => entry.emoji);
  assert.ok(smileResults.length > 0, "Expected smile query to return results");

  const laughResults = search("laugh", dataset, 5).map((entry) => entry.emoji);
  assert.ok(laughResults.includes("😂") || laughResults.includes("🤣"), "Expected laugh to return a laughing emoji");

  const hahaResults = search("haha", dataset, 5).map((entry) => entry.emoji);
  assert.ok(hahaResults.includes("😂") || hahaResults.includes("🤣"), "Expected haha to return a laughing emoji");

  const fireResults = search("fire", dataset, 5).map((entry) => entry.emoji);
  assert.ok(fireResults.includes("🔥"), "Expected fire to return the fire emoji");

  process.stdout.write("Smoke tests passed.\n");
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});

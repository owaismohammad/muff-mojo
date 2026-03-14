document.addEventListener("DOMContentLoaded", () => {
  const examples = [
    { emoji: "😂", label: ":joy", subtitle: "laugh / haha / tears", key: "Enter" },
    { emoji: "🔥", label: ":fire", subtitle: "fire / hot / lit", key: "Tab" },
    { emoji: "❤️", label: ":heart", subtitle: "love / heart / crush", key: "Enter" },
    { emoji: "🥺", label: ":plead", subtitle: "please / begging / eyes", key: "ArrowUp" },
  ];

  const list = document.getElementById("emoji-list");
  const siteLink = document.getElementById("site-link");

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    siteLink.href = chrome.runtime.getURL("src/muffmojo/website/index.html");
  }

  list.innerHTML = "";

  examples.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "example";

    const emoji = document.createElement("span");
    emoji.className = "example-emoji";
    emoji.textContent = entry.emoji;

    const copy = document.createElement("div");
    copy.className = "example-copy";

    const label = document.createElement("span");
    label.className = "example-label";
    label.textContent = entry.label;

    const subtitle = document.createElement("span");
    subtitle.className = "example-subtitle";
    subtitle.textContent = entry.subtitle;

    const key = document.createElement("span");
    key.className = "example-key";
    key.textContent = entry.key;

    copy.appendChild(label);
    copy.appendChild(subtitle);
    item.appendChild(emoji);
    item.appendChild(copy);
    item.appendChild(key);
    list.appendChild(item);
  });
});

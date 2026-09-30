import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const failures = [];

function expectFile(relativePath) {
  const file = path.join(distRoot, relativePath);
  if (!existsSync(file)) failures.push(`missing ${relativePath}`);
  return file;
}

expectFile("index.html");
expectFile("404.html");
expectFile("favicon.svg");

const expectedImages = [
  "12-观察谜题-图块1.png",
  "12-观察谜题-图块2.png",
  "12-观察谜题-图块3.png",
  "12-观察谜题-图块4.png",
  "12-观察谜题-组合图.png"
];

for (const image of expectedImages) {
  expectFile(`book-images/${image}`);
}

const slugs = [
  "front-matter",
  ...Array.from({ length: 65 }, (_, index) =>
    String(index + 1).padStart(2, "0")
  ),
  "glossary"
];

for (const slug of slugs) {
  const file = expectFile(`chapters/${slug}/index.html`);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  if (!html.includes('lang="zh-CN"')) failures.push(`${slug}: missing language`);
  if (!html.includes("章节目录")) failures.push(`${slug}: missing sidebar`);
  if (!html.includes("<article")) failures.push(`${slug}: missing article`);
  if (!html.includes("<h1")) failures.push(`${slug}: missing primary heading`);
  if (html.includes("/Users/")) failures.push(`${slug}: leaks an absolute path`);
  if (html.includes("[^")) failures.push(`${slug}: raw footnote syntax in chrome`);
  if (html.includes("**")) failures.push(`${slug}: raw strong syntax in page`);
  if (html.includes("\uE000")) failures.push(`${slug}: strong boundary marker leaked`);

  const sidebar =
    html.match(
      /<aside id="book-sidebar"[\s\S]*?<\/aside>/
    )?.[0] ?? "";
  const sidebarLinks = sidebar.match(/href="\/chapters\/[^"]+\/"/g) ?? [];
  if (sidebarLinks.length !== slugs.length) {
    failures.push(
      `${slug}: expected ${slugs.length} sidebar links, found ${sidebarLinks.length}`
    );
  }
  const currentLinks = sidebar.match(/aria-current="page"/g) ?? [];
  if (currentLinks.length !== 1) {
    failures.push(
      `${slug}: expected one current sidebar link, found ${currentLinks.length}`
    );
  }
}

const htmlFiles = readdirSync(path.join(distRoot, "chapters"), {
  recursive: true
}).filter((name) => name.endsWith(".html"));

if (htmlFiles.length !== slugs.length) {
  failures.push(
    `expected ${slugs.length} chapter pages, found ${htmlFiles.length}`
  );
}

const indexHtml = readFileSync(expectFile("index.html"), "utf8");
const partCards = indexHtml.match(/class="part-card"/g) ?? [];
if (partCards.length !== 8) {
  failures.push(`homepage: expected 8 part cards, found ${partCards.length}`);
}
if (!indexHtml.includes('href="/chapters/front-matter/"')) {
  failures.push("homepage: missing start-reading link");
}

const navigationChecks = [
  ["front-matter", 'href="/chapters/01/"'],
  ["01", 'href="/chapters/front-matter/"'],
  ["01", 'href="/chapters/02/"'],
  ["65", 'href="/chapters/64/"'],
  ["65", 'href="/chapters/glossary/"'],
  ["glossary", 'href="/chapters/65/"'],
  ["glossary", '<strong>返回全书目录</strong>']
];

for (const [slug, marker] of navigationChecks) {
  const html = readFileSync(
    path.join(distRoot, "chapters", slug, "index.html"),
    "utf8"
  );
  if (!html.includes(marker)) {
    failures.push(`${slug}: missing navigation marker ${marker}`);
  }
}

const emphasisChecks = [
  ["01", "<strong>谜底：</strong>乔治是在白天上床的。"],
  ["02", "<strong>答：</strong>完全不能。"],
  [
    "62",
    "<strong>用从容不迫的方式与孩子交谈，并经常停顿。</strong>孩子说完以后"
  ]
];

for (const [slug, marker] of emphasisChecks) {
  const html = readFileSync(
    path.join(distRoot, "chapters", slug, "index.html"),
    "utf8"
  );
  if (!html.includes(marker)) {
    failures.push(`${slug}: missing normalized Chinese emphasis`);
  }
}

const chapter12 = readFileSync(
  path.join(distRoot, "chapters", "12", "index.html"),
  "utf8"
);
const chapter12Images = chapter12.match(/src="\/book-images\/[^"]+"/g) ?? [];
if (chapter12Images.length !== expectedImages.length) {
  failures.push(
    `12: expected ${expectedImages.length} content images, found ${chapter12Images.length}`
  );
}

const chapter45 = readFileSync(
  path.join(distRoot, "chapters", "45", "index.html"),
  "utf8"
);
const chapter45Toc =
  chapter45.match(/<aside class="toc-rail">([\s\S]*?)<\/aside>/)?.[1] ?? "";
const chapter45TocItems = chapter45Toc.match(/<li/g) ?? [];
if (chapter45TocItems.length > 28) {
  failures.push(`45: page TOC has ${chapter45TocItems.length} items`);
}
if (!chapter45Toc.includes("请在正文中继续阅读")) {
  failures.push("45: missing truncated TOC message");
}
if (!chapter45.includes('class="footnotes"')) {
  failures.push("45: missing rendered footnotes");
}

const assetRoot = path.join(distRoot, "_astro");
const css = readdirSync(assetRoot)
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(path.join(assetRoot, name), "utf8"))
  .join("\n");
const styleChecks = [
  ["mobile breakpoint", /@media\s*\((?:max-width:|width<=)50rem\)/],
  ["mobile drawer", /\.nav-open\s+\.book-sidebar/],
  ["dark theme", /\[data-theme=(?:"dark"|dark)\]/],
  ["large font", /\[data-font-size=(?:"large"|large)\]/]
];
for (const [name, pattern] of styleChecks) {
  if (!pattern.test(css)) {
    failures.push(`styles: missing ${name}`);
  }
}

if (failures.length > 0) {
  console.error("Build verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Verified ${slugs.length} reading pages, navigation, responsive styles, and required assets.`
);

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bookRoot = path.resolve(projectRoot, "..");
const generatedRoot = path.join(projectRoot, "src", "generated");
const contentRoot = path.join(generatedRoot, "content");
const imageSourceRoot = path.join(bookRoot, "images");
const imageOutputRoot = path.join(projectRoot, "public", "book-images");

const sections = [
  {
    id: "part-1",
    title: "第一部分　理解口吃系统",
    description: "从整体与系统视角重新认识慢性口吃。",
    start: 1,
    end: 6
  },
  {
    id: "part-2",
    title: "第二部分　口吃者的思维模式",
    description: "观察角色、环境与自我认知怎样影响言语。",
    start: 7,
    end: 11
  },
  {
    id: "part-3",
    title: "第三部分　一切取决于你怎样看",
    description: "探索感知、观察、表现恐惧与改变。",
    start: 12,
    end: 22
  },
  {
    id: "part-4",
    title: "第四部分　口吃与遗传",
    description: "审视遗传、科学与流畅背后的机制。",
    start: 23,
    end: 26
  },
  {
    id: "part-5",
    title: "第五部分　康复之路",
    description: "来自康复者、治疗师与实践者的多条路径。",
    start: 27,
    end: 43
  },
  {
    id: "part-6",
    title: "第六部分　三年康复历程",
    description: "通过长期通信追踪安德鲁的改变过程。",
    start: 44,
    end: 45
  },
  {
    id: "part-7",
    title: "第七部分　克服当众讲话的恐惧",
    description: "一套由十次练习构成的公开演讲课程。",
    start: 46,
    end: 56
  },
  {
    id: "part-8",
    title: "第八部分　下一步往哪里走？",
    description: "继续改变所需的社群、书籍与实践资源。",
    start: 57,
    end: 65
  }
];

const titleOverrides = new Map([
  [1, "导言与“范式瘫痪”"],
  [7, "导言与“扮演别人”"],
  [12, "导言与“观察的力量”"],
  [23, "导言：遗传因素的作用"],
  [27, "导言：康复之路"],
  [44, "导言：三年康复故事"],
  [46, "导言：克服当众讲话的恐惧"],
  [57, "导言：下一步往哪里走？"]
]);

function fail(message) {
  console.error(`Content preparation failed: ${message}`);
  process.exit(1);
}

function getSingleFile(pattern) {
  const matches = readdirSync(bookRoot).filter((name) => pattern.test(name));
  if (matches.length !== 1) {
    fail(`expected one file matching ${pattern}, found ${matches.length}`);
  }
  return matches[0];
}

function stripHeadingMarkdown(text) {
  return text
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return stripHeadingMarkdown(match?.[1] ?? "") || fallback;
}

function extractSourcePages(markdown) {
  const sourceLine = markdown
    .split("\n")
    .find((line) => line.includes("译文依据") && line.includes("PDF"));
  return sourceLine?.match(/PDF 第\s*\d+(?:[–-]\d+)?\s*页/)?.[0] ?? "";
}

function readingMinutes(markdown) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "")
    .replace(/[#>*_`|:[\]()-]/g, "");
  const count = (plain.match(/[\p{Script=Han}A-Za-z0-9]/gu) ?? []).length;
  return Math.max(1, Math.ceil(count / 450));
}

function rewriteImagePaths(markdown) {
  const absolutePrefix = `${bookRoot}${path.sep}images${path.sep}`;
  return markdown.split(absolutePrefix).join("/book-images/");
}

rmSync(generatedRoot, { recursive: true, force: true });
rmSync(imageOutputRoot, { recursive: true, force: true });
mkdirSync(contentRoot, { recursive: true });
mkdirSync(imageOutputRoot, { recursive: true });

if (existsSync(imageSourceRoot)) {
  cpSync(imageSourceRoot, imageOutputRoot, { recursive: true });
}

const chapterRecords = [];

function addContent({ slug, number, title, sectionId, sectionTitle, sourceFile }) {
  const sourcePath = path.join(bookRoot, sourceFile);
  if (!existsSync(sourcePath)) fail(`missing ${sourceFile}`);

  const source = readFileSync(sourcePath, "utf8");
  if (!source.trim()) fail(`${sourceFile} is empty`);
  if (!source.startsWith("# ")) fail(`${sourceFile} does not begin with an H1`);

  const contentFile = `${slug}.md`;
  const prepared = rewriteImagePaths(source);
  writeFileSync(path.join(contentRoot, contentFile), prepared);

  chapterRecords.push({
    slug,
    number,
    title,
    sectionId,
    sectionTitle,
    href: `/chapters/${slug}/`,
    contentFile,
    sourceFile,
    sourcePages: extractSourcePages(source),
    readingMinutes: readingMinutes(source)
  });
}

addContent({
  slug: "front-matter",
  number: null,
  title: "书前内容",
  sectionId: "front",
  sectionTitle: "开始阅读",
  sourceFile: "00-书前内容.md"
});

for (let number = 1; number <= 65; number += 1) {
  const prefix = String(number).padStart(2, "0");
  const sourceFile = getSingleFile(new RegExp(`^${prefix}-.*\\.md$`));
  const source = readFileSync(path.join(bookRoot, sourceFile), "utf8");
  const section = sections.find(
    ({ start, end }) => number >= start && number <= end
  );
  if (!section) fail(`chapter ${prefix} has no section`);

  addContent({
    slug: prefix,
    number,
    title:
      titleOverrides.get(number) ??
      extractTitle(source, sourceFile.replace(/^\d+-|\.md$/g, "")),
    sectionId: section.id,
    sectionTitle: section.title,
    sourceFile
  });
}

addContent({
  slug: "glossary",
  number: null,
  title: "译名与术语表",
  sectionId: "appendix",
  sectionTitle: "附录",
  sourceFile: "00-术语表.md"
});

const outputSections = [
  {
    id: "front",
    title: "开始阅读",
    description: "封面、版权、题辞、前言、序言与完整目录。"
  },
  ...sections.map(({ id, title, description }) => ({ id, title, description })),
  {
    id: "appendix",
    title: "附录",
    description: "全书统一使用的译名与术语。"
  }
].map((section) => ({
  ...section,
  chapters: chapterRecords.filter(({ sectionId }) => sectionId === section.id)
}));

const imageReferences = chapterRecords.flatMap(({ contentFile, sourceFile }) => {
  const markdown = readFileSync(path.join(contentRoot, contentFile), "utf8");
  return [...markdown.matchAll(/!\[[^\]]*\]\(\/book-images\/([^)]+)\)/g)].map(
    ([, filename]) => ({ filename: decodeURIComponent(filename), sourceFile })
  );
});

for (const { filename, sourceFile } of imageReferences) {
  if (!existsSync(path.join(imageOutputRoot, filename))) {
    fail(`${sourceFile} references missing image ${filename}`);
  }
}

writeFileSync(
  path.join(generatedRoot, "chapters.json"),
  `${JSON.stringify(chapterRecords, null, 2)}\n`
);
writeFileSync(
  path.join(generatedRoot, "sections.json"),
  `${JSON.stringify(outputSections, null, 2)}\n`
);

console.log(
  `Prepared ${chapterRecords.length} reading pages across ${outputSections.length} sections.`
);

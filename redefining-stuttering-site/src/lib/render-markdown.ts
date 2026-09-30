import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import type { PageHeading } from "./types";

const STRONG_BOUNDARY_MARKER = "\uE000";

// Markdown delimiter rules can reject bold text that touches Chinese characters.
// Temporary invisible boundaries let the parser recognize it without changing spacing.
function normalizeStrongBoundaries(value: string) {
  return value.replace(
    /\*\*((?:(?!\*\*)[^\n])+)\*\*/g,
    (strong, _content, offset: number) => {
      const before = value[offset - 1] ?? "";
      const after = value[offset + strong.length] ?? "";
      const openBoundary =
        before !== "" && !/\s/u.test(before)
          ? `${STRONG_BOUNDARY_MARKER} `
          : "";
      const closeBoundary =
        after !== "" && !/\s/u.test(after)
          ? ` ${STRONG_BOUNDARY_MARKER}`
          : "";

      return `${openBoundary}${strong}${closeBoundary}`;
    }
  );
}

function removeStrongBoundaryMarkers(value: string) {
  return value
    .replaceAll(`${STRONG_BOUNDARY_MARKER} `, "")
    .replaceAll(` ${STRONG_BOUNDARY_MARKER}`, "")
    .replaceAll(STRONG_BOUNDARY_MARKER, "");
}

function stripInlineMarkdown(value: string) {
  return removeStrongBoundaryMarkers(value)
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function createSlug(value: string, fallback: string) {
  const slug = stripInlineMarkdown(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function renderMarkdown(markdown: string) {
  const headings: PageHeading[] = [];
  const slugCounts = new Map<string, number>();
  const normalizedMarkdown = normalizeStrongBoundaries(markdown);
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false
  }).use(footnote);

  const defaultHeadingOpen =
    md.renderer.rules.heading_open ??
    ((tokens, index, options, _env, self) =>
      self.renderToken(tokens, index, options));

  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const depth = Number(token.tag.slice(1));
    const text = tokens[index + 1]?.content ?? "";
    const baseSlug = createSlug(text, `section-${index}`);
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

    token.attrSet("id", slug);
    if (depth === 2 || depth === 3) {
      headings.push({ depth, slug, text: stripInlineMarkdown(text) });
    }

    return defaultHeadingOpen(tokens, index, options, env, self);
  };

  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, index, options, _env, self) =>
      self.renderToken(tokens, index, options));

  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = String(tokens[index].attrGet("href") ?? "");
    if (/^https?:\/\//i.test(href)) {
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  };

  return {
    html: removeStrongBoundaryMarkers(md.render(normalizedMarkdown)),
    headings
  };
}

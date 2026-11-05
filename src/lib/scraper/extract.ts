import { load } from "cheerio";

const REMOVED =
  "head, script, style, noscript, template, svg, canvas, iframe, object, embed, nav, footer, button, select, textarea, [hidden], [aria-hidden='true']";

const BLOCKS = new Set([
  "address", "article", "aside", "blockquote", "dd", "details", "div", "dl", "dt", "fieldset", "figcaption",
  "figure", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "ol", "p", "pre",
  "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);

type DomNode = { type: string; name?: string; data?: string; children?: DomNode[] };
const LINE_BREAK = "\n";

export function cleanLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/[​-‍⁠﻿]/g, "").replace(/\s+/g, " ").trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines;
}

export function htmlToText(html: string): string {
  const $ = load(html, { xml: { xmlMode: false, decodeEntities: true } });
  $(REMOVED).remove();
  const parts: string[] = [];
  const stack: (DomNode | typeof LINE_BREAK)[] = [$.root()[0] as unknown as DomNode];
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    if (item === LINE_BREAK) {
      parts.push(LINE_BREAK);
      continue;
    }
    if (item.type === "text") {
      parts.push(item.data ?? "");
      continue;
    }
    if (item.name === "br") {
      parts.push(LINE_BREAK);
      continue;
    }
    if (item.name && BLOCKS.has(item.name)) {
      parts.push(LINE_BREAK);
      stack.push(LINE_BREAK);
    }
    const children = item.children ?? [];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  return cleanLines(parts.join("")).join("\n");
}

const QUESTION_PREFIX = /^(?:(?:q(?:uestion)?|pertanyaan|soal)\s*\d*\s*[:.)\-]\s*|\d{1,3}\s*[.):]\s*|[-*•·–—]\s*)+/i;
const MIN_QUESTION_LENGTH = 10;
const MAX_QUESTION_LENGTH = 300;
const MIN_QUESTION_WORDS = 3;

export function extractQuestions(text: string): string[] {
  const seen = new Set<string>();
  const questions: string[] = [];
  for (const line of cleanLines(text)) {
    for (const sentence of line.split(/(?<=[.!?？])\s+/)) {
      const question = sentence.replace(QUESTION_PREFIX, "").trim().replace(/？$/, "?");
      if (!question.endsWith("?")) continue;
      if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) continue;
      if (question.split(" ").length < MIN_QUESTION_WORDS) continue;
      const key = question.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push(question);
    }
  }
  return questions;
}

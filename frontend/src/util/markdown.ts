import { micromark } from "micromark";
import { gfmFootnote, gfmFootnoteHtml } from "micromark-extension-gfm-footnote";
import {
  gfmStrikethrough,
  gfmStrikethroughHtml,
} from "micromark-extension-gfm-strikethrough";
import { gfmTable, gfmTableHtml } from "micromark-extension-gfm-table";
import { math, mathHtml } from "micromark-extension-math";

/** render markdown to html */
export const render = (markdown: string) => {
  const html = micromark(markdown, {
    extensions: [gfmFootnote(), gfmStrikethrough(), gfmTable(), math()],
    htmlExtensions: [
      gfmFootnoteHtml(),
      gfmStrikethroughHtml(),
      gfmTableHtml(),
      mathHtml(),
    ],
  });
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  return document;
};

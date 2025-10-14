import { uniqueId } from "lodash";
import { extractRawText } from "mammoth";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/** parse word file data */
export const parseWordDoc = async (buffer: ArrayBuffer) =>
  (await extractRawText({ arrayBuffer: buffer })).value;

/** parse pdf file data */
export const parsePdf = async (buffer: ArrayBuffer) => {
  const pdf = await pdfjs.getDocument(buffer).promise;
  let text = "";
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++)
    text +=
      (await (await pdf.getPage(pageIndex)).getTextContent()).items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ") + "\n";
  return text;
};

/** support text file extensions */
export const textExtensions = [".txt", ".md", ".doc", ".docx", ".pdf"];

/** supported text file mime types */
export const textAccepts = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/msword",
];

/** support image file extensions */
export const imageExtensions = [".png", ".jpeg", ".jpg", ".gif", ".svg"];

/** supported image file mime types */
export const imageAccepts = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/svg+xml",
];

/** parse file as text */
export const parseFile = async (file: File) => {
  let data = "";

  /** parse as appropriate format */

  if (file.name.match(/\.(doc|docx)$/))
    /** word doc */
    data = await parseWordDoc(await file.arrayBuffer());
  else if (file.name.match(/\.(pdf)$/))
    /** pdf */
    data = await parsePdf(await file.arrayBuffer());
  else if (file.name.match(/\.(gif|jpg|jpeg|png)$/))
    /** image */
    data = window.btoa(
      Array.from(new Uint8Array(await file.arrayBuffer()))
        .map((b) => String.fromCharCode(b))
        .join(""),
    );
  else if (file.name.match(/\.(svg)$/))
    /** svg */
    data = window.btoa(await file.text());
  else
    /** plain text */
    data = await file.text();

  /** extension pattern */
  const extensions = textExtensions
    .concat(imageExtensions)
    .map((ext) => ext.replace(/^\./, ""))
    .join("|");

  return {
    id: uniqueId(),
    data,
    uri: `data:${file.type};base64,${data}`,
    filename: file.name,
    name: file.name.replace(new RegExp(`\\.(${extensions})$`, "i"), ""),
    type: file.type,
  };
};

export type Upload = Awaited<ReturnType<typeof parseFile>>;

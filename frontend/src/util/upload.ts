import {
  Image,
  ImagePlay,
  ImagePlus,
  Printer,
  SplinePointer,
  TextInitial,
  Type,
} from "lucide-vue-next";
import { extractRawText } from "mammoth";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker?url";
import { hash } from "@/util/misc";

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
export const textExtensions = [
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".pdf",
  ".py",
  ".ipynb",
  ".R",
  ".Rmd",
];

/** supported text file mime types */
export const textAccepts = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/x-python",
  "application/x-python-code",
  "application/x-ipynb+json",
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
  let icon = Type;

  /** split filename */
  const [, name = file.name, extension = ""] =
    file.name.match(/(.*)(\.[\w\d]+$)/) || [];

  /** parse as appropriate format */

  if ([".doc", ".docx"].includes(extension)) {
    /** word doc */
    data = await parseWordDoc(await file.arrayBuffer());
    icon = TextInitial;
  } else if ([".pdf"].includes(extension)) {
    /** pdf */
    data = await parsePdf(await file.arrayBuffer());
    icon = Printer;
  } else if ([".gif", ".jpg", ".jpeg", ".png"].includes(extension)) {
    /** image */
    data = window.btoa(
      Array.from(new Uint8Array(await file.arrayBuffer()))
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    );
    icon = Image;
    if ([".gif"].includes(extension)) icon = ImagePlay;
    if ([".png"].includes(extension)) icon = ImagePlus;
  } else if ([".svg"].includes(extension)) {
    /** svg */
    data = window.btoa(await file.text());
    icon = SplinePointer;
  } else {
    /** plain text */
    data = await file.text();
    icon = Type;
  }

  return {
    hash: hash([name, data].join("|")),
    filename: file.name,
    type: file.type,
    data,
    uri: `data:${file.type};base64,${data}`,
    name,
    extension,
    icon,
  };
};

export type Upload = Awaited<ReturnType<typeof parseFile>>;

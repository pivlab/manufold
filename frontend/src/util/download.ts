import {
  BlobWriter,
  Data64URIReader,
  TextReader,
  ZipWriter,
} from "@zip.js/zip.js";

/** download url as file */
const download = (
  /** url to download */
  url: string,
  /** single filename string or filename "parts" */
  filename: string,
  /** extension, without dot */
  ext: string,
) => {
  /** add extension */
  if (!filename.endsWith("." + ext)) filename += "." + ext;

  /** trigger download */
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

/** make url from blob */
export const getUrl = (
  /** blob data to download */
  data: BlobPart,
  /** mime type */
  type: string,
) =>
  typeof data === "string" && data.startsWith("data:")
    ? data
    : window.URL.createObjectURL(new Blob([data], { type }));

/** download string as markdown file */
export const downloadMd = (data: string, filename: string) =>
  download(getUrl(data, "text/markdown;charset=utf-8"), filename, "md");

/** download string as html file */
export const downloadHtml = (data: string, filename: string) =>
  download(getUrl(data, "text/html;charset=utf-8"), filename, "html");

/** download multiple files as zip */
export const downloadZip = async (
  files: { filename: string; data: string }[],
  filename: string,
) => {
  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
  await Promise.all(
    files.map(({ data, filename }) =>
      zipWriter.add(
        filename,
        data.startsWith("data:")
          ? new Data64URIReader(data)
          : new TextReader(data),
      ),
    ),
  );
  const blob = await zipWriter.close();
  const url = window.URL.createObjectURL(blob);
  download(url, filename, "zip");
  window.URL.revokeObjectURL(url);
};

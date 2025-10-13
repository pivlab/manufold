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

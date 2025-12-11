/** https://app.quicktype.io/?l=ts */

export interface Cite {
  publisher?: string;
  abstract?: string;
  DOI?: string;
  type?: string;
  source?: string;
  title?: string;
  volume?: string;
  author?: Author[];
  "container-title"?: string;
  language?: string;
  issued?: DateParts;
  URL?: string;
  PMID?: string;
  id?: string;
  note?: string;
  accessed?: DateParts;
  "container-title-short"?: string;
  "publisher-place"?: string;
  ISSN?: string;
  page?: string;
  issue?: string;
  PMCID?: string;
}

export interface DateParts {
  "date-parts"?: [number, number, number][];
}

export interface Author {
  given?: string;
  family?: string;
}

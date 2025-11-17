/** in string, replace regex capture group with replacement string from func */
export const replaceRegex = (
  string: string,
  regex: RegExp,
  replace: (match: RegExpMatchArray) => string | null,
) => {
  let match: RegExpMatchArray | null;
  while ((match = regex.exec(string))) {
    const indices = match.indices?.[0];
    if (!indices) break;
    const [start, end] = indices;
    const result = replace(match);
    if (result === null) continue;
    string = string.substring(0, start) + result + string.substring(end);
  }
  return string;
};

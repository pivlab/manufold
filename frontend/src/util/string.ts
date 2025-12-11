export const splice = (
  string: string,
  start: number,
  end: number,
  replacement: string,
) => string.substring(0, start) + replacement + string.substring(end);

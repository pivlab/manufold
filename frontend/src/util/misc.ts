export const sleep = async (ms = 0) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/** simple hash func https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript */
export const hash = (string: string) => {
  let hash = 0;
  for (let i = 0, len = string.length; i < len; i++) {
    hash = (hash << 5) - hash + string.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

/** select element text */
export const selectElementText = (element: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

/** api base url */
export const api = import.meta.env.VITE_API;

/** generic request */
export const request = async <Response>(
  url: string | URL,
  options: RequestInit = {},
) => {
  /** normalize url to url object */
  url = new URL(url);

  /** create request */
  const request = new Request(url, options);

  /** make request */
  const response = await fetch(request);

  /** check status */
  if (!response.ok) throw Error(response.statusText);

  /** try to parse as json */
  let parsed: Response | undefined = undefined;
  try {
    parsed = await response.clone().json();
  } catch (error) {
    console.warn(error);
    throw Error("Failed to parse response as JSON");
  }

  return parsed;
};

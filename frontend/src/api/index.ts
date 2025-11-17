import { SSE } from "sse.js";
import type { ReadyStateEvent, SSEOptions, SSEvent } from "sse.js";

/** api base url */
export const api = import.meta.env.VITE_API;

/** generic request */
export const request = async <Response>(
  url: string | URL,
  options: RequestInit = {},
): Promise<Response> => {
  /** normalize url to url object */
  url = new URL(url);

  /** create request */
  const request = new Request(url, options);

  /** make request */
  const response = await fetch(request);

  /** check status */
  if (!response.ok) throw Error(response.statusText);

  /** try to parse as json */
  let parsed: Response;
  try {
    parsed = await response.clone().json();
  } catch (error) {
    console.warn(error);
    throw Error("Failed to parse response as JSON");
  }

  return parsed;
};

/** generic server sent event request */
export const sseRequest = async <Event>(
  url: string,
  /** request options */
  options: SSEOptions = {},
  /** message event callback */
  onMessage?: (
    /** current event */
    event: Event,
    /** events up to this point */
    events: Event[],
  ) => void,
) => {
  /** start request */
  const source = new SSE(url, options);

  if (!source) throw new Error("Failed to create SSE source");

  /** combined events */
  const events: Event[] = [];

  /** on message receive */
  source.addEventListener("message", (event: { data: string }) => {
    /** parse data */
    const eventData = JSON.parse(event.data) as Event;
    /** record log */
    events.push(eventData);
    onMessage?.(eventData, events);
  });

  /** wait for source to close */
  await new Promise((resolve, reject) => {
    source.addEventListener(
      "readystatechange",
      ({ readyState }: ReadyStateEvent) => readyState === 2 && resolve(true),
    );
    source.addEventListener("error", (error: SSEvent) => reject(error));
  });

  return events;
};

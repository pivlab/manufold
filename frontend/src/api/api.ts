/** https://github.com/google/adk-docs/issues/63 */
import type { Event } from "adk-typescript/events";
import type { Session, SessionOptions } from "adk-typescript/sessions";
import { startCase, uniq } from "lodash";
import { api, request, sseRequest } from "@/api";
import type { Cite } from "@/api/manubot";
import { waitFor } from "@/util/misc";

/** session params */
const app = "ai_science_writer";
const user = "user";
const session = `session-${Math.floor(Date.now() / 1000)}`;

/** session url */
const sessionApi = `${api}/adk_api/apps/${app}/users/${user}/sessions/${session}`;
/** run url */
const runApi = `${api}/adk_api/run`;
/** run sse url */
const runSseApi = `${api}/adk_api/run_sse`;

/** get or create session */
export const getSession = async () => {
  try {
    /** get existing session */
    return await request<Session>(sessionApi);
  } catch (error) {
    /** payload to provide backend */
    const payload: SessionOptions = { state: {} };

    /** request options */
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };

    /** create new session */
    const session = await waitFor(() => request<Session>(sessionApi, options));
    if (session) return session;
    throw Error("Couldn't create session after several tries");
  }
};

/** extract text from llm response */
export const extractText = (response?: Event[]) =>
  response
    ?.map((item) =>
      item.content?.parts
        /** only keep "text" parts */
        .filter((part) => part.text !== undefined)
        .map((part) => part.text)
        .join("\n"),
    )
    /** filter out empties */
    .filter((text) => typeof text === "string" && text.trim())
    /** get last paragraph */
    .at(-1) ?? "";

// type Runner = InstanceType<(typeof import("adk-typescript").runners)["Runner"]>;
// type RunPayload = Parameters<Runner["runAsync"]>[0];

/** run ai manuscript action */
export const aiScienceWriter = async (
  input: string,
  session: Session,
  onMessage?: (message: string) => void,
) => {
  /** payload to provide backend */
  const payload = {
    appName: session.appName,
    userId: session.userId,
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: input }] },
  };

  /** request options */
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(payload),
  };

  /** log messages from llm */
  const _onMessage = (event: Event) => {
    console.debug(event);
    const { author, actions: { transferToAgent } = {} } = event;
    if (transferToAgent) onMessage?.(startCase(transferToAgent));
    else if (author) onMessage?.(startCase(author));
  };

  /** make request */
  const response = await sseRequest(runSseApi, options, _onMessage);

  console.debug(response);

  return extractText(response);
};

/** send e.g. image backend */
export const uploadArtifact = async (
  session: Session,
  name: string,
  data: string,
  type: string,
) => {
  /** payload to provide backend */
  const payload = {
    appName: session.appName,
    userId: session.userId,
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [{ inlineData: { displayName: name, data, mimeType: type } }],
    },
  };

  /** request options */
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };

  /** make request */
  const response = await request<Event[]>(runApi, options);

  console.debug(response);

  const text = extractText(response);

  try {
    /** expect response to be stringified json describing artifact */
    const { title, description, figure_number } = JSON.parse(text) as {
      title: string;
      description: string;
      figure_number: number;
    };
    return { title, description, figure_number };
  } catch (error) {
    throw Error("Couldn't parse artifact response");
  }
};

export type { Session };

const citationCache: Record<string, Cite> = {};

/** manubot cite */
export const manubotCite = async (ids: string[]) => {
  /** de-dupe */
  ids = uniq(ids);
  /** ids not already cited */
  const newIds = ids.filter((id) => !citationCache[id]);

  if (newIds.length) {
    /** request url */
    const url = "https://manubot-api.cu-dbmi.dev/cite";
    /** request options */
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: newIds }),
    };

    /** request response */
    const citations = await request<Cite[]>(url, options);

    /** add each citation to cache */
    citations.forEach((citation, index) => {
      const id = newIds[index];
      if (!id) return;
      citationCache[id] = citation;
    });
  }

  return ids.map((id) => ({ ...citationCache[id], id }));
};

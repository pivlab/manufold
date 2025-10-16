/** https://github.com/google/adk-docs/issues/63 */
import type { Event } from "adk-typescript/events";
import type { Session, SessionOptions } from "adk-typescript/sessions";
import { api, request, sseRequest } from "@/api";
import { sleep } from "@/util/misc";

/** session params */
const app = "ai_science_writer";
const user = "user";
const session = `session-${Math.floor(Date.now() / 1000)}`;

/** session url */
const sessionApi = `${api}/adk_api/apps/${app}/users/${user}/sessions/${session}`;
/** run url */
const runUrl = `${api}/adk_api/run_sse`;

/** create session options */
const options = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ state: {} } satisfies SessionOptions),
};

/** get or create session */
export const getSession = async () => {
  try {
    /** get existing session */
    return await request<Session>(sessionApi);
  } catch (error) {
    /** retries with backoff */
    const waits = [100, 500, 1000, 2000, 3000, 4000, 5000];
    for (const wait of waits) {
      try {
        /** create new session */
        return await request<Session>(sessionApi, options);
      } catch (error) {
        console.warn(error);
        await sleep(wait);
      }
    }
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

/** run ai manuscript action */
export const aiScienceWriter = async (
  input: string,
  session: Session,
  message?: (message: string) => void,
) => {
  const runPayload = {
    appName: session.appName,
    userId: session.userId,
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: input }] },
  };

  const runOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(runPayload),
  };

  /** log messages from llm */
  const onMessage = (event: Event) => {
    let msg = "";
    if (event.actions?.transferToAgent)
      msg = `<b>${event.author}</b><br />${event.actions.transferToAgent}`;
    else if (event.content?.parts[0]?.text)
      msg = `<b>${event.author}</b><br />produced text`;
    if (msg) message?.(msg);
  };

  const response = await sseRequest(runUrl, runOptions, onMessage);

  return extractText(response);
};

export type { Session };

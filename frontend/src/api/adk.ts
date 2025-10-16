import { api, request } from "@/api";
import { sleep } from "@/util/misc";

/** session params */
const app = import.meta.env.VITE_TITLE;
const user = "user";
const session = `session-${Math.floor(Date.now() / 1000)}`;

/** session url */
const url = `${api}/adk_api/apps/${app}/users/${user}/sessions/${session}`;

/** create session options */
const options = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ state: {} }),
};

export type SessionResponse = {
  id: string;
  appName: string;
  userId: string;
  [key: string]: unknown;
};

/** get or create session */
export const getSession = async () => {
  try {
    /** get existing session */
    return await request<SessionResponse>(url);
  } catch (error) {
    const waits = [100, 500, 1000, 2000, 3000, 4000, 5000];
    for (const wait of waits) {
      try {
        /** create new session */
        return await request<SessionResponse>(url, options);
      } catch (error) {
        console.warn(error);
        await sleep(wait);
      }
    }
    throw Error("Couldn't create session after several tries");
  }
};

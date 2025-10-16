import type { SessionResponse } from "@/api/adk";

export const manugen = async (text: string, session: SessionResponse) => {
  console.log(text, session);
};

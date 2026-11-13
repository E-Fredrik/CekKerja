import { BadRequest, handle } from "../../../lib/http.ts";
import { parseInterviewRequest, prepareInterview } from "./prepare-interview.ts";

export const POST = handle(async (req) => {
  const body = await req.json().catch(() => {
    throw new BadRequest("Send the interview details as JSON");
  });
  return prepareInterview(parseInterviewRequest(body));
});

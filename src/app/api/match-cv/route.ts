import { BadRequest, handle } from "../../../lib/http.ts";
import { matchCv, parseMatchRequest } from "../../../lib/match/match.ts";

export const POST = handle(async (req) => {
  const body = await req.json().catch(() => {
    throw new BadRequest("Send the job ad and CV as JSON");
  });
  return matchCv(parseMatchRequest(body));
});

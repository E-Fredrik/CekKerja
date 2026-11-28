import { signedInUserId } from "../../../lib/cv/store.ts";
import { routeSupabase } from "../../../lib/db/server.ts";
import { BadRequest, handle } from "../../../lib/http.ts";
import { matchCv, parseMatchRequest } from "../../../lib/match/match.ts";

export const POST = handle(async (req) => {
  await signedInUserId(await routeSupabase());
  const body = await req.json().catch(() => {
    throw new BadRequest("Send the job ad and CV as JSON");
  });
  return matchCv(parseMatchRequest(body));
});

import { BadRequest, handle } from "../../../lib/http.ts";
import { analyzeAd, parseAdRequest } from "./analyze-ad.ts";

export const checkAdRoute = handle(async (req) => {
  const body = await req.json().catch(() => {
    throw new BadRequest("Send the job ad as JSON");
  });
  return analyzeAd(parseAdRequest(body));
});

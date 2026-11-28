import { BadRequest, handle } from "../../../lib/http.ts";
import { parseInterviewForm, parseInterviewRequest, prepareInterview } from "./prepare-interview.ts";

export const interviewRoute = handle(async (req) => {
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => {
      throw new BadRequest("Send the interview details as a form");
    });
    return prepareInterview(parseInterviewForm(form));
  }
  const body = await req.json().catch(() => {
    throw new BadRequest("Send the interview details as JSON");
  });
  return prepareInterview(parseInterviewRequest(body));
});

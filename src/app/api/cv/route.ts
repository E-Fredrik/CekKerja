import { readCv } from "../../../lib/cv/profile.ts";
import { BadRequest, checkFile, handle, langOf } from "../../../lib/http.ts";

export const POST = handle(async (req) => {
  const form = await req.formData().catch(() => {
    throw new BadRequest("Upload the CV as a form with a file");
  });
  return readCv(checkFile(form.get("file"), "CV"), langOf(form.get("lang")));
});

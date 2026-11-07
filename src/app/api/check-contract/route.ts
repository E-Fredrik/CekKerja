import { analyzeContract } from "../../../lib/ai/analyze.ts";
import { BadRequest, checkFile, handle, langOf, modeOf } from "../../../lib/http.ts";

export const POST = handle(async (req) => {
  const form = await req.formData().catch(() => {
    throw new BadRequest("Upload the contract as a form with a file");
  });
  return analyzeContract(checkFile(form.get("file"), "Contract"), langOf(form.get("lang")), modeOf(form.get("mode")));
});

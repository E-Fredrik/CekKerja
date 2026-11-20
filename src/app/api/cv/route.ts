import { readCv } from "../../../lib/cv/profile.ts";
import { deleteCv, loadCv, signedInUserId, storeCv } from "../../../lib/cv/store.ts";
import { routeSupabase } from "../../../lib/db/server.ts";
import { BadRequest, checkFile, handle, langOf } from "../../../lib/http.ts";

async function signedIn() {
  const db = await routeSupabase();
  const userId = await signedInUserId(db);
  return { db: db!, userId };
}

export const GET = handle(async () => {
  const { db, userId } = await signedIn();
  return { cv: await loadCv(db, userId) };
});

export const POST = handle(async (req) => {
  const { db, userId } = await signedIn();
  const form = await req.formData().catch(() => {
    throw new BadRequest("Upload the CV as a form with a file");
  });
  const cv = await readCv(checkFile(form.get("file"), "CV"), langOf(form.get("lang")));
  return { cv: await storeCv(db, userId, cv) };
});

export const DELETE = handle(async () => {
  const { db, userId } = await signedIn();
  await deleteCv(db, userId);
  return { ok: true };
});

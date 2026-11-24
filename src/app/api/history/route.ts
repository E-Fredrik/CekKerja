import { signedInUserId } from "../../../lib/cv/store.ts";
import { historyCursor, loadHistory } from "../../../lib/db/history.ts";
import { routeSupabase } from "../../../lib/db/server.ts";
import { BadRequest, SignInNeeded } from "../../../lib/http.ts";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const db = await routeSupabase();
    if (!db) throw new SignInNeeded();
    const userId = await signedInUserId(db);
    const id = params.get("id");
    const created_at = params.get("before");
    const cursor = id === null && created_at === null ? undefined : historyCursor.safeParse({ id, created_at });
    if (cursor && !cursor.success) throw new BadRequest("Invalid history cursor");

    return Response.json(await loadHistory(db, userId, cursor?.data), { headers });
  } catch (error) {
    const status = error instanceof SignInNeeded ? 401 : error instanceof BadRequest ? 400 : 500;
    return Response.json({ error: "Could not load check history" }, { status, headers });
  }
}

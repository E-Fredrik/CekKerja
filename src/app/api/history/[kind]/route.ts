import { POST as checkAd } from "../../check-ad/route.ts";
import { POST as checkContract } from "../../check-contract/route.ts";
import { POST as prepareInterview } from "../../interview/route.ts";
import { signedInUserId } from "../../../../lib/cv/store.ts";
import { historyEntry, historyKind, saveHistory } from "../../../../lib/db/history.ts";
import { routeSupabase } from "../../../../lib/db/server.ts";
import { SignInNeeded } from "../../../../lib/http.ts";

const handlers = { ad: checkAd, contract: checkContract, interview: prepareInterview };
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const kind = historyKind.safeParse((await params).kind);
  if (!kind.success) return Response.json({ error: "Unknown check" }, { status: 404, headers });

  const fetchSite = request.headers.get("sec-fetch-site");
  if (request.headers.get("x-cekkerja-history") !== "1" || (fetchSite && fetchSite !== "same-origin")) {
    return Response.json({ error: "Invalid check request" }, { status: 403, headers });
  }

  try {
    const db = await routeSupabase();
    if (!db) throw new SignInNeeded();
    const userId = await signedInUserId(db);
    const response = await handlers[kind.data](request);
    if (!response.ok) return response;

    const result = await response.json();
    try {
      await saveHistory(db, userId, historyEntry(kind.data, result));
    } catch {
      console.warn(`Check history not saved for a ${kind.data} check`);
    }
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof SignInNeeded) {
      return Response.json({ code: "signIn" }, { status: 401, headers });
    }
    return Response.json({ code: "unknown" }, { status: 500, headers });
  }
}

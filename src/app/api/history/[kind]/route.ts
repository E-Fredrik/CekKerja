import { checkAdRoute as checkAd } from "../../check-ad/handler.ts";
import { checkContractRoute as checkContract } from "../../check-contract/handler.ts";
import { interviewRoute as prepareInterview } from "../../interview/handler.ts";
import { canRunCheck, loadPlanStatus } from "../../../../lib/billing/plan.ts";
import { signedInUserId } from "../../../../lib/cv/store.ts";
import { historyEntry, historyKind, saveHistory } from "../../../../lib/db/history.ts";
import { routeSupabase } from "../../../../lib/db/server.ts";
import { SignInNeeded } from "../../../../lib/http.ts";

const handlers = { ad: checkAd, contract: checkContract, interview: prepareInterview };
const headers = { "Cache-Control": "private, no-store" };

async function requestedMode(request: Request): Promise<"fast" | "smart"> {
  const clone = request.clone();
  const type = clone.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await clone.formData();
      return form.get("mode") === "smart" ? "smart" : "fast";
    }
    const body = (await clone.json()) as { mode?: unknown };
    return body?.mode === "smart" ? "smart" : "fast";
  } catch {
    return "fast";
  }
}

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
    const [plan, mode] = await Promise.all([loadPlanStatus(db, userId), requestedMode(request)]);
    const allowed = canRunCheck(plan, mode);
    if (!allowed.allowed) {
      return Response.json({ code: allowed.reason }, { status: 403, headers });
    }

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

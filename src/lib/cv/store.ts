import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSecondFactor } from "../auth/routes.ts";
import { SignInNeeded } from "../http.ts";
import { CvProfile, trimCv } from "./profile.ts";

export const CV_TABLE = "cv_profiles";

export async function signedInUserId(db: SupabaseClient | null): Promise<string> {
  if (!db) throw new SignInNeeded();
  const { data } = await db.auth.getClaims();
  const id = data?.claims?.sub;
  if (typeof id !== "string" || !hasSecondFactor(data?.claims?.amr)) throw new SignInNeeded();
  return id;
}

export async function loadCv(db: SupabaseClient, userId: string): Promise<CvProfile | null> {
  const { data, error } = await db.from(CV_TABLE).select("profile").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Could not load the CV: ${error.message}`);
  const parsed = CvProfile.safeParse(data?.profile);
  return parsed.success ? trimCv(parsed.data) : null;
}

export async function storeCv(db: SupabaseClient, userId: string, cv: CvProfile): Promise<CvProfile> {
  const profile = trimCv(cv);
  const { error } = await db.from(CV_TABLE).upsert({ user_id: userId, profile, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save the CV: ${error.message}`);
  return profile;
}

export async function deleteCv(db: SupabaseClient, userId: string): Promise<void> {
  const { error } = await db.from(CV_TABLE).delete().eq("user_id", userId);
  if (error) throw new Error(`Could not delete the CV: ${error.message}`);
}

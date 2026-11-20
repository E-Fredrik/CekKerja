export const PROTECTED_PATHS = ["/lowongan", "/kontrak", "/interview"];

export const GUEST_ONLY_PATHS = ["/masuk", "/daftar"];

export const SIGN_IN_PATH = "/masuk";

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const isProtectedPath = (path: string) => matches(path, PROTECTED_PATHS);

export const isGuestOnlyPath = (path: string) => matches(path, GUEST_ONLY_PATHS);

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || raw.length > 512) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  if (/[\u0000-\u001f]/.test(raw)) return "/";
  if (isGuestOnlyPath(raw.split(/[?#]/)[0])) return "/";
  return raw;
}

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };

export const DISALLOW_ALL = "User-agent: *\nDisallow: /";

function parseRobots(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let readingAgents = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || !readingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.split("/")[0].trim().toLowerCase());
      readingAgents = true;
      continue;
    }
    readingAgents = false;
    if ((key === "allow" || key === "disallow") && current && value) {
      current.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  return groups;
}

export function matchesPattern(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const glob = anchored ? pattern.slice(0, -1) : `${pattern}*`;
  let p = 0;
  let s = 0;
  let star = -1;
  let resume = 0;
  while (s < path.length) {
    if (p < glob.length && glob[p] === "*") {
      star = p++;
      resume = s;
    } else if (p < glob.length && glob[p] === path[s]) {
      p++;
      s++;
    } else if (star >= 0) {
      p = star + 1;
      s = ++resume;
    } else {
      return false;
    }
  }
  while (p < glob.length && glob[p] === "*") p++;
  return p === glob.length;
}

export function isAllowedByRobots(robotsTxt: string, botName: string, path: string): boolean {
  if (path === "/robots.txt") return true;
  const groups = parseRobots(robotsTxt);
  const token = botName.toLowerCase();
  const own = groups.filter((group) => group.agents.includes(token));
  const chosen = own.length > 0 ? own : groups.filter((group) => group.agents.includes("*"));
  let best: Rule | null = null;
  for (const rule of chosen.flatMap((group) => group.rules)) {
    if (!matchesPattern(rule.pattern, path)) continue;
    const longer = !best || rule.pattern.length > best.pattern.length;
    const tieAllows = best && rule.pattern.length === best.pattern.length && rule.allow;
    if (longer || tieAllows) best = rule;
  }
  return best ? best.allow : true;
}

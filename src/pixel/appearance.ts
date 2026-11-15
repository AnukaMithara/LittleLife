import { BUILTIN } from "./characters";
import { FACINGS, type Facing } from "./engine";

export const APPEARANCE_KEY = "littlelife.pixel.v1";
export interface Appearance {
  version: 1;
  character: string;
  primary?: string;
  accent?: string;
  facing: Facing | "auto";
}
/** `known` says whether a character id exists, built in or imported. */
export function restoreAppearance(
  raw: string | null,
  known: (id: string) => boolean = (id) => BUILTIN.some((c) => c.id === id),
): Appearance {
  const fallback: Appearance = {
    version: 1,
    character: "moss",
    facing: "auto",
  };
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!data || typeof data !== "object") return fallback;
    const s = data as Record<string, unknown>;
    if (s.version !== 1) return fallback;
    const color = (key: string) =>
      typeof s[key] === "string" && /^#[0-9a-f]{6}$/i.test(s[key] as string)
        ? (s[key] as string)
        : undefined;
    return {
      version: 1,
      character:
        typeof s.character === "string" && known(s.character)
          ? s.character
          : "moss",
      facing:
        s.facing === "auto" || FACINGS.includes(s.facing as Facing)
          ? (s.facing as Facing | "auto")
          : "auto",
      primary: color("primary"),
      accent: color("accent"),
    };
  } catch {
    return fallback;
  }
}

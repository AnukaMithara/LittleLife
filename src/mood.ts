/** What the person seems to be doing, and the company that suits it. Pure and offline. */
export const ACTIVITIES = [
  "coding",
  "music",
  "video",
  "meeting",
  "browsing",
  "writing",
  "chatting",
  "designing",
  "gaming",
  "away",
  "other",
] as const;
export type Activity = (typeof ACTIVITIES)[number];
export interface Sense {
  activity: Activity;
  /** Sound is playing on this device. */
  audio: boolean;
  /** What is playing, whatever is in front: music, or a video keeping the screen awake. */
  media: Media;
  /** Seconds since the keyboard or pointer was last used anywhere. */
  idleSeconds: number;
}
export const MEDIA = ["none", "music", "video"] as const;
export type Media = (typeof MEDIA)[number];
export const UNKNOWN: Sense = {
  activity: "other",
  audio: false,
  media: "none",
  idleSeconds: 0,
};
export function restoreSense(raw: unknown): Sense {
  if (!raw || typeof raw !== "object") return UNKNOWN;
  const s = raw as Record<string, unknown>;
  const idle = s.idleSeconds;
  return {
    activity: ACTIVITIES.includes(s.activity as Activity)
      ? (s.activity as Activity)
      : "other",
    audio: s.audio === true,
    media: MEDIA.includes(s.media as Media) ? (s.media as Media) : "none",
    idleSeconds:
      typeof idle === "number" && Number.isFinite(idle) ? Math.max(0, idle) : 0,
  };
}

export type Vibe = "focus" | "music" | "watch" | "meeting" | "away" | "free";
export function vibe(sense: Sense): Vibe {
  switch (sense.activity) {
    case "away":
      return "away";
    case "meeting":
      return "meeting";
    case "video":
      return "watch";
    case "coding":
    case "writing":
    case "designing":
      return "focus";
    case "music":
      return "music";
    default:
      return sense.media === "music" ? "music" : "free";
  }
}
/** Music is on and nothing asks for stillness, so idle moments become a little dance. */
export function grooving(sense: Sense): boolean {
  const now = vibe(sense);
  return now === "music" || (now === "focus" && sense.media === "music");
}
/** The person is occupied: keep to a corner rather than wander across their work. */
export function settles(sense: Sense): boolean {
  const now = vibe(sense);
  return now === "focus" || now === "watch" || now === "meeting";
}
/** Reminders and chatter wait while the person is in a call or watching something. */
export function busy(sense: Sense): boolean {
  const now = vibe(sense);
  return now === "meeting" || now === "watch";
}
/** A short line when the mood changes. Undefined means stay quiet. */
export function greeting(next: Vibe, previous: Vibe): string | undefined {
  if (previous === "away" && next !== "meeting")
    return "You're back! I missed you.";
  switch (next) {
    case "focus":
      return "Deep work? I'll keep out of your way.";
    case "music":
      return "Ooh, I like this one! ♪";
    case "watch":
      return "Movie time! I'll watch from the corner.";
    case "meeting":
      return "Shh… I'll be quiet for your call.";
    default:
      return undefined;
  }
}

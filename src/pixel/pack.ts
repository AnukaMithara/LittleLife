/**
 * Character packs: one JSON document describing a whole character as data.
 * A pack holds colors, pixel grids and timed poses, and nothing that runs.
 * Everything read here is untrusted, so the result is rebuilt field by field.
 */
import {
  BONES,
  EXPRESSIONS,
  HEIGHT,
  POSES,
  validateCharacter,
  WIDTH,
  type Bone,
  type Clip,
  type Expression,
  type Frame,
  type Grid,
  type Palette,
  type Part,
  type PixelCharacter,
  type Pose,
} from "./engine";

export const PACK_FORMAT = "littlelife.character";
export const PACK_VERSION = 1;
export const LIMITS = {
  /** Size of one pack file, in characters. */
  size: 400_000,
  parts: 40,
  colors: 40,
  frames: 16,
  name: 24,
  title: 28,
  line: 60,
  credit: 80,
  /** Imported characters kept at once. */
  packs: 12,
} as const;
export interface CharacterPack extends PixelCharacter {
  format: typeof PACK_FORMAT;
  version: typeof PACK_VERSION;
}
export class PackError extends Error {}
const fail = (message: string): never => {
  throw new PackError(message);
};

type Json = Record<string, unknown>;
const object = (value: unknown, what: string): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : fail(`${what} is missing or not an object.`);
function text(value: unknown, what: string, max: number): string {
  if (typeof value !== "string") return fail(`${what} must be text.`);
  // Keep it to one printable line.
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!clean || clean.length > max)
    return fail(`${what} must be 1 to ${max} characters.`);
  return clean;
}
function whole(value: unknown, what: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value))
    return fail(`${what} must be a whole number.`);
  if (value < min || value > max)
    return fail(`${what} must be between ${min} and ${max}.`);
  return value;
}
function amount(value: unknown, what: string, limit: number): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return fail(`${what} must be a number.`);
  if (Math.abs(value) > limit) return fail(`${what} is out of range.`);
  return value;
}
function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  what: string,
): T {
  return options.includes(value as T)
    ? (value as T)
    : fail(`${what} must be one of: ${options.join(", ")}.`);
}
function grid(value: unknown, what: string, palette: Palette, k: number): Grid {
  if (!Array.isArray(value)) return fail(`${what} must be a list of rows.`);
  if (value.length > HEIGHT * k)
    return fail(`${what} is taller than ${HEIGHT * k}.`);
  const rows = value.map((row) =>
    typeof row === "string" ? row : fail(`${what} rows must be text.`),
  );
  for (const row of rows) {
    if (!row.length || row.length > WIDTH * k || row.length !== rows[0].length)
      return fail(`${what} rows must share one width of 1 to ${WIDTH * k}.`);
    for (const token of row)
      if (token !== "." && !Object.hasOwn(palette, token))
        return fail(`${what} uses "${token}", which is not in the palette.`);
  }
  return rows;
}
/** A table whose keys come from a fixed list; anything else is refused. */
function table<K extends string, V>(
  value: unknown,
  keys: readonly K[],
  what: string,
  read: (item: unknown, what: string) => V,
): Partial<Record<K, V>> | undefined {
  if (value === undefined) return undefined;
  const result: Partial<Record<K, V>> = {};
  for (const [key, item] of Object.entries(object(value, what)))
    result[oneOf(key, keys, `${what} entry`)] = read(item, `${what}.${key}`);
  return result;
}
function palette(value: unknown): Palette {
  const entries = Object.entries(object(value, "The palette"));
  if (!entries.length || entries.length > LIMITS.colors)
    fail(`The palette needs 1 to ${LIMITS.colors} colors.`);
  const result: Palette = {};
  for (const [token, color] of entries) {
    if ([...token].length !== 1 || token === "." || /\s/.test(token))
      fail(`Palette keys are single characters, not "${token}".`);
    if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))
      fail(`Palette color "${token}" must look like #a1b2c3.`);
    result[token] = (color as string).toLowerCase();
  }
  return result;
}
function part(value: unknown, index: number, colors: Palette, k: number): Part {
  const raw = object(value, `Part ${index + 1}`);
  const what = `Part "${typeof raw.id === "string" ? raw.id : index + 1}"`;
  const pixels = (item: unknown, name: string) => grid(item, name, colors, k);
  const result: Part = {
    id: text(raw.id, `${what} id`, 32),
    bone: oneOf<Bone>(raw.bone, BONES, `${what} bone`),
    x: whole(raw.x, `${what} x`, -WIDTH * k, 2 * WIDTH * k),
    y: whole(raw.y, `${what} y`, -HEIGHT * k, 2 * HEIGHT * k),
    pixels: pixels(raw.pixels, `${what} pixels`),
  };
  const attachments = table(
    raw.attachments,
    POSES,
    `${what} attachments`,
    (b, w) => oneOf<Bone>(b, BONES, w),
  );
  if (attachments) result.attachments = attachments;
  if (raw.poses !== undefined) {
    if (!Array.isArray(raw.poses) || !raw.poses.length)
      fail(`${what} poses must be a list of pose names.`);
    result.poses = (raw.poses as unknown[]).map((pose) =>
      oneOf<Pose>(pose, POSES, `${what} poses`),
    );
  }
  const views = table(
    raw.views,
    ["right", "back"] as const,
    `${what} views`,
    pixels,
  );
  if (views) result.views = views;
  for (const key of ["expressions", "profileExpressions"] as const) {
    const faces = table<Expression, Grid>(
      raw[key],
      EXPRESSIONS,
      `${what} ${key}`,
      pixels,
    );
    if (faces) result[key] = faces;
  }
  return result;
}
function clip(value: unknown, what: string): Clip {
  const frames = object(value, what).frames;
  if (!Array.isArray(frames) || !frames.length || frames.length > LIMITS.frames)
    return fail(`${what} needs 1 to ${LIMITS.frames} frames.`);
  return {
    frames: frames.map((item, index) => {
      const name = `${what} frame ${index + 1}`;
      const raw = object(item, name);
      const frame: Frame = {
        duration: whole(raw.duration, `${name} duration`, 60, 5000),
      };
      if (raw.expression !== undefined)
        frame.expression = oneOf<Expression>(
          raw.expression,
          EXPRESSIONS,
          `${name} expression`,
        );
      const bones = table(raw.bones, BONES, `${name} bones`, (move, w) => {
        const m = object(move, w);
        const result: { x?: number; y?: number; angle?: number } = {};
        if (m.x !== undefined) result.x = amount(m.x, `${w} x`, 40);
        if (m.y !== undefined) result.y = amount(m.y, `${w} y`, 40);
        if (m.angle !== undefined)
          result.angle = amount(m.angle, `${w} angle`, 360);
        return result;
      });
      if (bones) frame.bones = bones;
      return frame;
    }),
  };
}

/** Read an untrusted pack, returning a character made only of checked values. */
export function parsePack(input: unknown): PixelCharacter {
  const raw = object(input, "The pack");
  if (raw.format !== PACK_FORMAT)
    fail(`This is not a LittleLife character pack (format "${PACK_FORMAT}").`);
  if (raw.version !== PACK_VERSION)
    fail(
      `This pack is version ${String(raw.version)}; this app reads version ${PACK_VERSION}.`,
    );
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(id))
    fail(
      "The id must be 2 to 32 lowercase letters, digits or hyphens, starting with a letter.",
    );
  const colors = palette(raw.palette);
  if (
    !Array.isArray(raw.parts) ||
    !raw.parts.length ||
    raw.parts.length > LIMITS.parts
  )
    fail(`A character needs 1 to ${LIMITS.parts} parts.`);
  // Twice the pixels in the same space, for characters drawn in fine detail.
  const k = raw.detail === undefined ? 1 : whole(raw.detail, "detail", 1, 2);
  const character: PixelCharacter = {
    id,
    name: text(raw.name, "The name", LIMITS.name),
    title: text(raw.title, "The title", LIMITS.title),
    palette: colors,
    parts: (raw.parts as unknown[]).map((item, index) =>
      part(item, index, colors, k),
    ),
  };
  if (k === 2) character.detail = 2;
  const rig = table(raw.rig, BONES, "rig", (joint, what) => {
    const j = object(joint, what);
    return {
      x: amount(j.x, `${what} x`, WIDTH * k),
      y: amount(j.y, `${what} y`, HEIGHT * k),
    };
  });
  if (rig) character.rig = rig;
  const clips = table(raw.clips, POSES, "clips", clip);
  if (clips) character.clips = clips;
  if (raw.traits !== undefined) {
    const traits = object(raw.traits, "traits");
    character.traits = {};
    if (traits.movement !== undefined)
      character.traits.movement = oneOf(
        traits.movement,
        ["walk", "fly", "swim"] as const,
        "traits.movement",
      );
  }
  if (raw.lines !== undefined) {
    const lines = object(raw.lines, "lines");
    character.lines = {};
    for (const key of ["pet", "play"] as const)
      if (lines[key] !== undefined)
        character.lines[key] = text(lines[key], `lines.${key}`, LIMITS.line);
  }
  for (const key of ["author", "license"] as const)
    if (raw[key] !== undefined)
      character[key] = text(raw[key], `The ${key}`, LIMITS.credit);
  try {
    validateCharacter(character);
  } catch (error) {
    fail(
      error instanceof Error ? error.message : "The character is not valid.",
    );
  }
  return character;
}
/** Read pack text as saved in a file. */
export function readPack(source: string): PixelCharacter {
  if (source.length > LIMITS.size)
    fail(`A pack file can be at most ${LIMITS.size / 1000} kB.`);
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    fail("This file is not valid JSON.");
  }
  return parsePack(data);
}
export function toPack(character: PixelCharacter): CharacterPack {
  return { format: PACK_FORMAT, version: PACK_VERSION, ...character };
}
/** Pack text for saving or sharing, with pixel rows kept one per line. */
export function writePack(character: PixelCharacter): string {
  return JSON.stringify(toPack(character), null, 1);
}

/** Small cutout animation engine. All output is snapped to a logical pixel grid. */
export const WIDTH = 64;
export const HEIGHT = 80;
export const POSES = [
  "idle",
  "walk",
  "sleep",
  "jump",
  "curious",
  "happy",
  "sit",
  "wave",
] as const;
export const FACINGS = ["front", "right", "back", "left"] as const;
export type Pose = (typeof POSES)[number];
export type Facing = (typeof FACINGS)[number];
export type Expression = "normal" | "blink" | "closed" | "happy";
export type Grid = readonly string[];
export type Palette = Record<string, string>;
export type Bone =
  "root" | "body" | "head" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg";
export interface Transform {
  x?: number;
  y?: number;
  angle?: number;
}
export interface Part {
  id: string;
  bone: Bone;
  x: number;
  y: number;
  pixels: Grid;
  attachments?: Partial<Record<Pose, Bone>>;
  views?: Partial<Record<"right" | "back", Grid>>;
  expressions?: Partial<Record<Expression, Grid>>;
  profileExpressions?: Partial<Record<Expression, Grid>>;
}
export interface PixelCharacter {
  id: string;
  name: string;
  title: string;
  palette: Palette;
  parts: readonly Part[];
}
export interface Frame {
  duration: number;
  bones?: Partial<Record<Bone, Transform>>;
  expression?: Expression;
}
export interface Clip {
  frames: readonly Frame[];
}
export const CLIPS: Record<Pose, Clip> = {
  idle: {
    frames: [
      { duration: 600 },
      { duration: 600, bones: { body: { y: 1 }, head: { y: -1 } } },
      { duration: 600 },
      { duration: 600, bones: { head: { y: 1 } } },
    ],
  },
  walk: {
    frames: [
      {
        duration: 140,
        bones: {
          leftLeg: { angle: 20 },
          rightLeg: { angle: -20 },
          leftArm: { angle: -15 },
          rightArm: { angle: 15 },
          body: { y: -1 },
        },
      },
      { duration: 140 },
      {
        duration: 140,
        bones: {
          leftLeg: { angle: -20 },
          rightLeg: { angle: 20 },
          leftArm: { angle: 15 },
          rightArm: { angle: -15 },
          body: { y: -1 },
        },
      },
      { duration: 140 },
    ],
  },
  sleep: {
    frames: [
      {
        duration: 900,
        expression: "closed",
        bones: {
          body: { y: 5 },
          head: { angle: 15, y: 1 },
          leftArm: { angle: -20 },
          rightArm: { angle: 20 },
          leftLeg: { angle: 65, y: -1 },
          rightLeg: { angle: -65, y: -1 },
        },
      },
      {
        duration: 900,
        expression: "closed",
        bones: {
          body: { y: 6 },
          head: { angle: 15, y: 1 },
          leftArm: { angle: -20 },
          rightArm: { angle: 20 },
          leftLeg: { angle: 65, y: -1 },
          rightLeg: { angle: -65, y: -1 },
        },
      },
    ],
  },
  jump: {
    frames: [
      {
        duration: 160,
        bones: {
          body: { y: 2 },
          leftLeg: { angle: 20 },
          rightLeg: { angle: -20 },
        },
      },
      {
        duration: 140,
        bones: {
          root: { y: -4 },
          leftArm: { angle: 120 },
          rightArm: { angle: -120 },
        },
      },
      {
        duration: 180,
        expression: "happy",
        bones: {
          root: { y: -8 },
          leftArm: { angle: 135 },
          rightArm: { angle: -135 },
          leftLeg: { angle: 15 },
          rightLeg: { angle: -15 },
        },
      },
      {
        duration: 140,
        bones: {
          root: { y: -4 },
          leftArm: { angle: 90 },
          rightArm: { angle: -90 },
        },
      },
      { duration: 200 },
    ],
  },
  curious: {
    frames: [
      { duration: 500, bones: { head: { angle: -12, x: -1 } } },
      {
        duration: 500,
        bones: { head: { angle: -18, x: -1 }, rightArm: { angle: 25 } },
      },
    ],
  },
  happy: {
    frames: [
      {
        duration: 220,
        expression: "happy",
        bones: {
          body: { angle: -3 },
          leftArm: { angle: 65 },
          rightArm: { angle: -65 },
        },
      },
      {
        duration: 220,
        expression: "happy",
        bones: {
          body: { angle: 3 },
          leftArm: { angle: 80 },
          rightArm: { angle: -80 },
        },
      },
    ],
  },
  sit: {
    frames: [
      {
        duration: 800,
        bones: {
          body: { y: 4 },
          leftLeg: { angle: 80 },
          rightLeg: { angle: -80 },
          leftArm: { angle: -20 },
          rightArm: { angle: 20 },
        },
      },
      {
        duration: 800,
        bones: {
          body: { y: 5 },
          leftLeg: { angle: 80 },
          rightLeg: { angle: -80 },
          leftArm: { angle: -20 },
          rightArm: { angle: 20 },
        },
      },
    ],
  },
  wave: {
    frames: [
      {
        duration: 220,
        bones: { leftArm: { angle: 145 }, head: { angle: -4 } },
      },
      {
        duration: 220,
        expression: "happy",
        bones: { leftArm: { angle: 115 }, head: { angle: 4 } },
      },
    ],
  },
};

// Bones rotate around attachment points in the shared 48 × 64 authoring space.
const RIG: Record<Bone, { parent?: Bone; x: number; y: number }> = {
  root: { x: 0, y: 0 },
  body: { parent: "root", x: 24, y: 43 },
  head: { parent: "body", x: 24, y: 29 },
  leftArm: { parent: "body", x: 15, y: 33 },
  rightArm: { parent: "body", x: 33, y: 33 },
  leftLeg: { parent: "root", x: 20, y: 48 },
  rightLeg: { parent: "root", x: 28, y: 48 },
};
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
function boneMatrix(
  bone: Bone,
  frame: Frame,
  cache: Partial<Record<Bone, Matrix>>,
): Matrix {
  if (cache[bone]) return cache[bone]!;
  const rig = RIG[bone],
    t = frame.bones?.[bone] ?? {};
  const angle = ((t.angle ?? 0) * Math.PI) / 180;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const local: Matrix = [
    c,
    s,
    -s,
    c,
    rig.x + (t.x ?? 0) - c * rig.x + s * rig.y,
    rig.y + (t.y ?? 0) - s * rig.x - c * rig.y,
  ];
  const result = multiply(
    rig.parent ? boneMatrix(rig.parent, frame, cache) : IDENTITY,
    local,
  );
  cache[bone] = result;
  return result;
}
export function samplePose(
  pose: Pose,
  elapsed: number,
  still = false,
): { frame: Frame; expression: Expression; index: number } {
  const frames = CLIPS[pose].frames;
  const duration = frames.reduce((sum, f) => sum + f.duration, 0);
  let time =
    still || !Number.isFinite(elapsed) ? 0 : Math.max(0, elapsed) % duration;
  let index = 0;
  while (index < frames.length - 1 && time >= frames[index].duration) {
    time -= frames[index].duration;
    index++;
  }
  const frame = frames[index];
  const blink = !still && elapsed % 4800 >= 4550;
  return {
    frame,
    expression: frame.expression ?? (blink ? "blink" : "normal"),
    index,
  };
}
function partGrid(part: Part, facing: Facing, expression: Expression): Grid {
  if (facing === "back") return part.views?.back ?? part.pixels;
  if (facing === "right")
    return (
      part.profileExpressions?.[expression] ??
      part.views?.right ??
      part.expressions?.[expression] ??
      part.pixels
    );
  return part.expressions?.[expression] ?? part.pixels;
}

/** Indexed logical pixels, independent of Canvas and deterministic for tests/export. */
export function compose(
  character: PixelCharacter,
  pose: Pose,
  facing: Facing,
  elapsed: number,
  still = false,
): string[] {
  const output = Array.from({ length: HEIGHT }, () =>
    Array<string>(WIDTH).fill("."),
  );
  const { frame, expression } = samplePose(pose, elapsed, still);
  const cache: Partial<Record<Bone, Matrix>> = {};
  const view = facing === "left" ? "right" : facing;
  for (const part of character.parts) {
    const grid = partGrid(part, view, expression);
    if (!grid.length) continue;
    const m = boneMatrix(part.attachments?.[pose] ?? part.bone, frame, cache);
    const width = grid[0].length,
      height = grid.length;
    const corners = [
      [part.x, part.y],
      [part.x + width, part.y],
      [part.x, part.y + height],
      [part.x + width, part.y + height],
    ];
    const xs = corners.map(([x, y]) => m[0] * x + m[2] * y + m[4] + 8);
    const ys = corners.map(([x, y]) => m[1] * x + m[3] * y + m[5] + 12);
    // Inverse sampling avoids pinholes when rotating individual source pixels.
    for (
      let y = Math.max(0, Math.floor(Math.min(...ys)));
      y < Math.min(HEIGHT, Math.ceil(Math.max(...ys)));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(Math.min(...xs)));
        x < Math.min(WIDTH, Math.ceil(Math.max(...xs)));
        x++
      ) {
        const dx = x + 0.5 - 8 - m[4],
          dy = y + 0.5 - 12 - m[5];
        const sx = Math.floor(m[0] * dx + m[1] * dy - part.x),
          sy = Math.floor(m[2] * dx + m[3] * dy - part.y);
        const color = grid[sy]?.[sx];
        if (color && color !== ".")
          output[y][facing === "left" ? WIDTH - 1 - x : x] = color;
      }
    }
  }
  if (pose === "happy") {
    const heart = [
      ".aa.aa.",
      "aaaaaaa",
      "aaaaaaa",
      ".aaaaa.",
      "..aaa..",
      "...a...",
    ];
    for (let y = 0; y < heart.length; y++)
      for (let x = 0; x < heart[y].length; x++)
        if (heart[y][x] !== ".") output[10 + y][48 + x] = "a";
  }
  if (pose === "sleep") {
    for (const [x, y] of [
      [47, 15],
      [52, 9],
    ])
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ])
        output[y + dy][x + dx] = "r";
  }
  return output.map((row) => row.join(""));
}
export function validateCharacter(character: PixelCharacter): void {
  for (const token of ["a", "r"])
    if (!/^#[0-9a-f]{6}$/i.test(character.palette[token] ?? ""))
      throw new Error(`Missing effect palette color: ${token}`);
  if (!character.parts.length || character.parts.length > 40)
    throw new Error("Use 1–40 pixel parts.");
  const ids = new Set<string>();
  for (const part of character.parts) {
    if (ids.has(part.id)) throw new Error("Pixel part IDs must be unique.");
    ids.add(part.id);
    if (
      !Number.isInteger(part.x) ||
      !Number.isInteger(part.y) ||
      !Object.hasOwn(RIG, part.bone) ||
      Object.values(part.attachments ?? {}).some(
        (bone) => !Object.hasOwn(RIG, bone),
      )
    )
      throw new Error("Invalid part attachment.");
    const grids = [
      part.pixels,
      ...Object.values(part.views ?? {}),
      ...Object.values(part.expressions ?? {}),
      ...Object.values(part.profileExpressions ?? {}),
    ];
    for (const grid of grids) {
      if (!grid.length) continue;
      if (
        !grid[0].length ||
        grid[0].length > WIDTH ||
        grid.length > HEIGHT ||
        grid.some((row) => row.length !== grid[0].length)
      )
        throw new Error("Invalid pixel grid dimensions.");
      for (const token of grid.join(""))
        if (
          token !== "." &&
          !/^#[0-9a-f]{6}$/i.test(character.palette[token] ?? "")
        )
          throw new Error(`Missing palette color: ${token}`);
    }
  }
}
export function recolor(
  palette: Palette,
  primary?: string,
  accent?: string,
): Palette {
  const result = { ...palette };
  const shade = (hex: string, amount: number) =>
    "#" +
    [1, 3, 5]
      .map((start) =>
        Math.max(
          0,
          Math.min(255, parseInt(hex.slice(start, start + 2), 16) + amount),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  for (const [color, roles] of [
    [primary, ["p", "q", "r"]],
    [accent, ["a", "b", "c"]],
  ] as const) {
    if (color && /^#[0-9a-f]{6}$/i.test(color)) {
      result[roles[0]] = color;
      result[roles[1]] = shade(color, -30);
      result[roles[2]] = shade(color, 30);
    }
  }
  return result;
}

import { eyesPart, part, Pixels } from "./art";
import {
  validateCharacter,
  type Clip,
  type Palette,
  type Part,
  type PixelCharacter,
} from "./engine";

/**
 * An original take on the Monkey King of the old tale: feathered circlet, staff
 * across the back, and a golden cloud that appears whenever he takes to the air.
 * He is also the worked example of a character with its own clips, pose-only
 * parts, a favourite way of moving and his own lines.
 */
const palette: Palette = {
  o: "#2a1f24",
  e: "#2a1f24",
  s: "#ecc98f",
  t: "#c99a64",
  h: "#f7dfab",
  u: "#6e4831",
  n: "#4b2f20",
  m: "#8d6245",
  // Robe: the recolorable outfit.
  p: "#8f2338",
  q: "#651a2b",
  r: "#b83c4f",
  // Cloud and trim: the recolorable accent.
  a: "#f2a12e",
  b: "#d9772a",
  c: "#ffd27a",
  g: "#f0c040",
  j: "#a87420",
  k: "#ffe58a",
  d: "#565a86",
  x: "#3b3e60",
  z: "#e8793a",
  i: "#e23b4e",
  l: "#a82438",
  w: "#ffffff",
  v: "#c9c4d6",
};
const CLOUD_POSES = ["fly", "swim", "sit", "sleep"] as const;

function headBack() {
  return new Pixels(24, 23)
    .ellipse(0, 0, 24, 23, "o")
    .ellipse(1, 1, 22, 21, "u")
    .ellipse(4, 2, 12, 7, "m")
    .rect(8, 17, 8, 1, "n")
    .rect(0, 9, 2, 6, "t")
    .rect(22, 9, 2, 6, "t")
    .grid();
}
function head(profile = false) {
  const p = new Pixels(24, 23);
  if (profile)
    return p
      .ellipse(5, 1, 17, 21, "o")
      .ellipse(6, 2, 15, 19, "u")
      .ellipse(7, 3, 8, 6, "m")
      .ellipse(12, 6, 10, 15, "s")
      .rect(20, 13, 3, 4, "s")
      .rect(21, 14, 2, 1, "h")
      .rect(13, 18, 8, 1, "t")
      .rect(7, 10, 3, 5, "t")
      .dot(8, 12, "s")
      .grid();
  return (
    p
      .ellipse(0, 0, 24, 23, "o")
      .ellipse(1, 1, 22, 21, "u")
      .ellipse(4, 2, 9, 5, "m")
      // A heart of bare face inside the fur.
      .ellipse(4, 5, 9, 9, "s")
      .ellipse(11, 5, 9, 9, "s")
      .ellipse(4, 8, 16, 13, "s")
      .ellipse(5, 6, 5, 5, "h")
      .rect(7, 19, 10, 1, "t")
      .rect(11, 15, 2, 1, "t")
      .rect(11, 5, 2, 3, "u")
      // Ears.
      .rect(0, 9, 2, 6, "t")
      .rect(22, 9, 2, 6, "t")
      .grid()
  );
}
/** A gold circlet with two striped feathers sweeping up and out. */
function circlet(view: "front" | "right" | "back") {
  const p = new Pixels(28, 17);
  const feather: [number, number][] = [
    [11, 12],
    [10, 11],
    [10, 10],
    [9, 9],
    [8, 8],
    [8, 7],
    [7, 6],
    [7, 5],
    [6, 4],
    [6, 3],
    [7, 2],
    [8, 1],
    [9, 0],
  ];
  feather.forEach(([x, y], index) => {
    const color = Math.floor(index / 2) % 2 ? "o" : "w";
    if (view !== "right") p.rect(x, y, 2, 1, color);
    // Mirrored for the other side; in profile the two overlap into one.
    p.rect(26 - x, y, 2, 1, color);
  });
  p.rect(3, 13, 22, 3, "j").rect(4, 13, 20, 2, "g").rect(6, 13, 16, 1, "k");
  if (view === "front")
    p.ellipse(11, 11, 6, 5, "j").ellipse(12, 12, 4, 3, "g").dot(13, 13, "i");
  if (view === "right") p.ellipse(19, 11, 5, 5, "j").rect(20, 12, 3, 3, "g");
  return p.grid();
}
function staff() {
  return new Pixels(44, 26)
    .polygon(
      [
        [0, 22],
        [41, 0],
        [44, 3],
        [3, 26],
      ],
      "o",
    )
    .polygon(
      [
        [1, 23],
        [41, 1],
        [43, 3],
        [3, 25],
      ],
      "i",
    )
    .polygon(
      [
        [3, 24],
        [42, 2],
        [43, 3],
        [3, 25],
      ],
      "l",
    )
    .polygon(
      [
        [1, 23],
        [8, 19],
        [10, 21],
        [3, 25],
      ],
      "g",
    )
    .polygon(
      [
        [34, 5],
        [41, 1],
        [43, 3],
        [36, 7],
      ],
      "g",
    )
    .grid();
}
function tail() {
  return new Pixels(14, 14)
    .ellipse(0, 0, 11, 11, "o")
    .ellipse(1, 1, 9, 9, "u")
    .ellipse(2, 2, 4, 3, "m")
    .ellipse(3, 3, 5, 5, "o")
    .ellipse(4, 4, 3, 3, ".")
    .rect(6, 9, 8, 4, "o")
    .rect(6, 10, 8, 2, "u")
    .rect(8, 10, 5, 1, "m")
    .grid();
}
/** The somersault cloud, with a wisp trailing behind. */
function cloud() {
  const p = new Pixels(48, 12);
  for (const [x, y, w, h] of [
    [3, 3, 14, 9],
    [11, 1, 14, 11],
    [21, 2, 14, 10],
    [31, 3, 15, 9],
  ])
    p.ellipse(x, y, w, h, "b");
  for (const [x, y, w, h] of [
    [4, 3, 12, 7],
    [12, 1, 12, 8],
    [22, 2, 12, 7],
    [32, 3, 13, 6],
  ])
    p.ellipse(x, y, w, h, "a");
  return p
    .rect(14, 2, 5, 1, "c")
    .rect(24, 3, 5, 1, "c")
    .rect(6, 4, 4, 1, "c")
    .rect(35, 4, 4, 1, "c")
    .polygon(
      [
        [0, 9],
        [5, 6],
        [5, 10],
      ],
      "b",
    )
    .grid();
}

const riding = (lift: number, reach: number, happy = false) => ({
  duration: 220,
  ...(happy ? { expression: "happy" as const } : {}),
  bones: {
    root: { y: lift },
    body: { y: 2, angle: -5 },
    head: { angle: 3 },
    leftLeg: { angle: 36, y: -1 },
    rightLeg: { angle: -36, y: -1 },
    leftArm: { angle: 30 },
    rightArm: { angle: reach },
  },
});
const cruising = (lift: number, nod: number) => ({
  duration: 620,
  bones: {
    root: { y: lift },
    body: { y: 4 },
    head: { angle: nod },
    leftLeg: { angle: 78 },
    rightLeg: { angle: -78 },
    leftArm: { angle: -18 },
    rightArm: { angle: 18 },
  },
});
const clips: Partial<Record<"fly" | "swim", Clip>> = {
  // Crouched on the cloud, one arm stretched ahead.
  fly: {
    frames: [
      riding(-3, -78),
      riding(-5, -92, true),
      riding(-4, -84),
      riding(-2, -72),
    ],
  },
  // Cross-legged and unhurried.
  swim: { frames: [cruising(-1, 0), cruising(-3, -4), cruising(-2, 3)] },
};

export function wukong(): PixelCharacter {
  const parts: Part[] = [part("tail", "body", 4, 38, tail())];
  parts.push(part("staff", "body", 2, 24, staff()));
  for (const [side, x] of [
    ["left", 17],
    ["right", 25],
  ] as const)
    parts.push(
      part(
        `${side}-leg`,
        side === "left" ? "leftLeg" : "rightLeg",
        x,
        47,
        new Pixels(7, 14)
          .rect(1, 0, 5, 11, "o")
          .rect(2, 0, 3, 10, "d")
          .rect(4, 1, 1, 8, "x")
          .rect(0, 9, 7, 5, "o")
          .rect(1, 10, 5, 2, "w")
          .rect(1, 12, 5, 1, "v")
          .grid(),
      ),
    );
  const torso = new Pixels(18, 19)
    .polygon(
      [
        [3, 0],
        [15, 0],
        [18, 6],
        [16, 19],
        [2, 19],
        [0, 6],
      ],
      "o",
    )
    .polygon(
      [
        [4, 1],
        [14, 1],
        [17, 6],
        [15, 18],
        [3, 18],
        [1, 6],
      ],
      "p",
    )
    .rect(3, 5, 3, 6, "r")
    .rect(13, 4, 2, 7, "q")
    .polygon(
      [
        [5, 1],
        [13, 1],
        [9, 8],
      ],
      "g",
    )
    .polygon(
      [
        [7, 1],
        [11, 1],
        [9, 5],
      ],
      "s",
    )
    .rect(2, 11, 14, 2, "g")
    .rect(8, 11, 2, 2, "k")
    // A tiger-skin wrap.
    .rect(2, 13, 14, 5, "z")
    .dot(4, 14, "o")
    .dot(8, 15, "o")
    .dot(12, 14, "o")
    .dot(6, 16, "o")
    .dot(10, 17, "o")
    .dot(14, 16, "o")
    .grid();
  const back = new Pixels(18, 19)
    .rect(2, 0, 14, 18, "o")
    .rect(3, 1, 12, 16, "q")
    .rect(4, 2, 9, 9, "p")
    .rect(3, 11, 12, 2, "g")
    .rect(3, 13, 12, 4, "z")
    .grid();
  parts.push(part("torso", "body", 15, 31, torso, { views: { back } }));
  for (const [side, x] of [
    ["left", 10],
    ["right", 31],
  ] as const)
    parts.push(
      part(
        `${side}-arm`,
        side === "left" ? "leftArm" : "rightArm",
        x,
        32,
        // A wide sleeve, a gold cuff, a bare hand.
        new Pixels(8, 18)
          .polygon(
            [
              [2, 0],
              [6, 0],
              [8, 11],
              [6, 17],
              [2, 17],
              [0, 11],
            ],
            "o",
          )
          .polygon(
            [
              [3, 1],
              [5, 1],
              [7, 10],
              [1, 10],
            ],
            "p",
          )
          .rect(2, 3, 1, 6, "r")
          .rect(1, 10, 6, 2, "g")
          .rect(2, 12, 4, 4, "s")
          .dot(2, 12, "h")
          .dot(5, 15, "t")
          .grid(),
      ),
    );
  parts.push(
    part("head", "head", 12, 9, head(), {
      views: { right: head(true), back: headBack() },
    }),
    eyesPart(),
    part("circlet", "head", 10, -3, circlet("front"), {
      views: { right: circlet("right"), back: circlet("back") },
    }),
    part("cloud", "root", 0, 54, cloud(), { poses: CLOUD_POSES }),
  );
  const character: PixelCharacter = {
    id: "wukong",
    name: "Wukong",
    title: "CLOUD RIDER",
    palette,
    parts,
    clips,
    traits: { movement: "fly" },
    lines: { pet: "Ha! Do that again.", play: "Catch me if you can!" },
    author: "LittleLife",
    license: "MIT",
  };
  validateCharacter(character);
  return character;
}

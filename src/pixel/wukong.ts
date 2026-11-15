import { Pixels, part } from "./art";
import {
  validateCharacter,
  type Clip,
  type Expression,
  type Grid,
  type Palette,
  type Part,
  type PixelCharacter,
} from "./engine";

/**
 * An original take on the Monkey King of the old tale: feathered circlet, staff
 * across the back, and a golden cloud that appears whenever he takes to the air.
 * He is drawn at double detail (a 96 × 128 authoring space) and is the worked
 * example of a character with its own clips, pose-only parts, a favourite way of
 * moving and his own lines.
 */
const palette: Palette = {
  o: "#2a1c22",
  e: "#1d1418",
  s: "#eec98e",
  t: "#c9975f",
  h: "#f8e2b0",
  u: "#74492f",
  n: "#4a2b1c",
  m: "#96684a",
  // Robe: the recolorable outfit.
  p: "#96243a",
  q: "#66172a",
  r: "#c0465a",
  // Cloud and trim: the recolorable accent.
  a: "#f4a62f",
  b: "#dc7a2b",
  c: "#ffd884",
  g: "#f2c33f",
  j: "#a56f1c",
  k: "#ffe993",
  d: "#5a5e8c",
  x: "#3c4064",
  f: "#7478a6",
  z: "#ea7c3a",
  y: "#d98ab8",
  i: "#e23b4e",
  l: "#9e2036",
  w: "#ffffff",
  v: "#c6c2d6",
};
const CLOUD_POSES = ["fly", "swim", "sit", "sleep"] as const;
type View = "front" | "right" | "back";

function head(view: View): Grid {
  const p = new Pixels(50, 48);
  if (view === "right")
    return p
      .ellipse(5, 2, 38, 42, "u")
      .polygon(
        [
          [6, 20],
          [1, 25],
          [6, 26],
          [2, 32],
          [8, 31],
          [6, 37],
          [13, 34],
        ],
        "u",
      )
      .ellipse(9, 5, 16, 7, "m")
      .ellipse(8, 28, 20, 13, "n")
      .ellipse(22, 10, 22, 30, "s")
      .ellipse(24, 12, 10, 9, "h")
      .ellipse(37, 23, 11, 12, "s")
      .ellipse(40, 25, 7, 6, "h")
      .rect(27, 38, 14, 1, "t")
      .dot(46, 27, "t")
      .ellipse(14, 18, 8, 12, "s")
      .ellipse(16, 21, 4, 7, "t")
      .outline("o")
      .grid();
  p.ellipse(3, 2, 44, 42, "u");
  for (const flip of [false, true]) {
    const side = new Pixels(50, 48).polygon(
      [
        [4, 21],
        [1, 27],
        [5, 26],
        [2, 33],
        [7, 31],
        [6, 37],
        [12, 34],
      ],
      "u",
    );
    if (flip) side.mirror();
    side.grid().forEach((row, y) =>
      [...row].forEach((cell, x) => {
        if (cell !== ".") p.dot(x, y, cell);
      }),
    );
  }
  p.polygon(
    [
      [19, 5],
      [22, 1],
      [25, 4],
      [28, 1],
      [31, 5],
    ],
    "u",
  ).ellipse(10, 4, 16, 7, "m");
  if (view === "back")
    return p
      .ellipse(12, 12, 26, 8, "m")
      .line(14, 28, 18, 33, "n")
      .line(24, 30, 25, 36, "n")
      .line(35, 28, 31, 33, "n")
      .ellipse(1, 18, 7, 11, "s")
      .ellipse(42, 18, 7, 11, "s")
      .outline("o")
      .grid();
  p.ellipse(8, 30, 34, 13, "n");
  return (
    p
      // A heart of bare face inside the fur.
      .ellipse(9, 11, 17, 17, "s")
      .ellipse(24, 11, 17, 17, "s")
      .ellipse(9, 16, 32, 25, "s")
      .ellipse(11, 13, 9, 7, "h")
      .ellipse(15, 27, 20, 12, "h")
      .rect(17, 39, 16, 1, "t")
      // Ears.
      .ellipse(1, 18, 7, 11, "s")
      .ellipse(3, 21, 3, 6, "t")
      .ellipse(42, 18, 7, 11, "s")
      .ellipse(44, 21, 3, 6, "t")
      .outline("o")
      .grid()
  );
}
function face(expression: Expression, profile = false): Grid {
  const p = new Pixels(50, 48);
  const eyes = profile ? [31] : [13, 28];
  eyes.forEach((x, index) => {
    const inner = profile || index === 1;
    // Brows slanting down toward the nose: sure of himself.
    if (inner) p.line(x + 9, 15, x, 18, "n", 2);
    else p.line(x, 15, x + 9, 18, "n", 2);
    if (expression === "normal")
      p.ellipse(x, 19, 9, 9, "w")
        .rect(x, 19, 9, 1, "o")
        .ellipse(x + (inner ? 1 : 2), 21, 6, 6, "g")
        .rect(x + (inner ? 2 : 4), 23, 3, 3, "e")
        .dot(x + (inner ? 2 : 3), 22, "w");
    else if (expression === "happy")
      p.line(x, 25, x + 4, 21, "o", 2).line(x + 4, 21, x + 8, 25, "o", 2);
    else p.rect(x, 23, 9, 2, "o").rect(x + 1, 25, 7, 1, "t");
  });
  if (profile) {
    p.dot(46, 28, "t");
    if (expression === "happy")
      p.ellipse(38, 31, 8, 5, "o").rect(40, 33, 4, 1, "i");
    else p.rect(38, 33, 8, 1, "o").rect(43, 34, 2, 2, "w");
    return p.grid();
  }
  p.dot(23, 29, "t").dot(26, 29, "t");
  if (expression === "happy")
    p.ellipse(19, 31, 12, 7, "o")
      .rect(21, 34, 8, 2, "i")
      .rect(22, 32, 6, 1, "w");
  // A sideways grin with one fang showing.
  else
    p.rect(20, 34, 10, 1, "o")
      .dot(30, 33, "o")
      .dot(19, 33, "o")
      .rect(27, 35, 2, 2, "w");
  return p.grid();
}
/** A gold circlet with two long striped feathers sweeping up and out. */
function circlet(view: View): Grid {
  const p = new Pixels(64, 40);
  const feather = (points: [number, number][], flip: boolean) => {
    let length = 0;
    for (let n = 1; n < points.length; n++) {
      const [x0, y0] = points[n - 1],
        [x1, y1] = points[n];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i < steps; i++, length++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / steps),
          y = Math.round(y0 + ((y1 - y0) * i) / steps);
        p.rect(
          flip ? 61 - x : x,
          y,
          3,
          2,
          Math.floor(length / 3) % 2 ? "o" : "w",
        );
      }
    }
  };
  const sweep: [number, number][] = [
    [27, 26],
    [24, 19],
    [18, 12],
    [11, 6],
    [7, 2],
    [10, 0],
    [15, 2],
  ];
  if (view !== "right") feather(sweep, false);
  feather(sweep, true);
  p.rect(9, 27, 46, 5, "g").rect(10, 27, 44, 1, "k").rect(9, 31, 46, 1, "j");
  if (view === "front")
    p.polygon(
      [
        [25, 28],
        [32, 17],
        [39, 28],
      ],
      "g",
    )
      .line(26, 27, 32, 18, "k")
      .ellipse(30, 22, 4, 4, "i")
      .dot(31, 23, "w")
      .ellipse(13, 26, 5, 5, "g")
      .ellipse(46, 26, 5, 5, "g");
  if (view === "right")
    p.polygon(
      [
        [44, 28],
        [51, 18],
        [56, 28],
      ],
      "g",
    ).ellipse(48, 23, 4, 4, "i");
  return p.outline("o").grid();
}
function staff(): Grid {
  return new Pixels(92, 58)
    .line(5, 53, 87, 5, "i", 4)
    .line(6, 55, 88, 7, "l", 2)
    .line(5, 53, 17, 46, "g", 5)
    .line(75, 12, 87, 5, "g", 5)
    .line(4, 52, 16, 45, "k", 1)
    .line(74, 11, 86, 4, "k", 1)
    .line(18, 43, 21, 48, "j", 2)
    .line(71, 12, 74, 17, "j", 2)
    .outline("o")
    .grid();
}
function tail(): Grid {
  const p = new Pixels(36, 40);
  const curl: [number, number][] = [
    [34, 31],
    [22, 35],
    [10, 31],
    [5, 21],
    [8, 10],
    [16, 5],
    [23, 9],
    [23, 16],
    [17, 18],
  ];
  for (let n = 1; n < curl.length; n++)
    p.line(curl[n - 1][0], curl[n - 1][1], curl[n][0], curl[n][1], "u", 5);
  for (let n = 1; n < 6; n++)
    p.line(
      curl[n - 1][0],
      curl[n - 1][1] - 2,
      curl[n][0],
      curl[n][1] - 2,
      "m",
      1,
    );
  return p.outline("o").grid();
}
function leg(): Grid {
  return (
    new Pixels(16, 30)
      .polygon(
        [
          [2, 0],
          [14, 0],
          [13, 20],
          [3, 20],
        ],
        "d",
      )
      .rect(10, 1, 3, 19, "x")
      .rect(4, 2, 2, 14, "f")
      .line(8, 3, 9, 17, "x")
      // A soft white boot with a dark sole.
      .rect(2, 19, 12, 7, "w")
      .rect(2, 19, 12, 1, "v")
      .rect(10, 20, 4, 6, "v")
      .rect(1, 26, 14, 2, "o")
      .outline("o")
      .grid()
  );
}
function torso(view: View): Grid {
  const p = new Pixels(40, 43).polygon(
    [
      [8, 1],
      [32, 1],
      [38, 12],
      [35, 41],
      [5, 41],
      [2, 12],
    ],
    "p",
  );
  p.polygon(
    [
      [28, 2],
      [32, 2],
      [37, 12],
      [35, 40],
      [28, 40],
    ],
    "q",
  )
    .rect(5, 11, 3, 12, "r")
    .line(13, 15, 12, 24, "q")
    .line(26, 15, 27, 24, "q");
  if (view !== "back")
    p.polygon(
      [
        [10, 1],
        [30, 1],
        [20, 17],
      ],
      "g",
    )
      .polygon(
        [
          [13, 1],
          [27, 1],
          [20, 12],
        ],
        "s",
      )
      .line(11, 2, 20, 16, "k")
      .line(17, 4, 20, 9, "t");
  else p.rect(9, 3, 22, 18, "q").rect(11, 4, 16, 14, "p");
  // Belt, tiger-skin wrap and a hanging sash.
  p.rect(4, 24, 32, 4, "g").rect(4, 24, 32, 1, "k").rect(4, 27, 32, 1, "j");
  p.polygon(
    [
      [3, 28],
      [37, 28],
      [38, 41],
      [2, 41],
    ],
    "z",
  )
    .rect(3, 28, 34, 1, "b")
    .line(8, 30, 6, 37, "n", 2)
    .line(14, 31, 13, 39, "n", 2)
    .line(26, 31, 27, 39, "n", 2)
    .line(32, 30, 34, 37, "n", 2)
    .rect(2, 40, 36, 1, "j");
  if (view !== "back")
    p.rect(17, 28, 6, 13, "y")
      .rect(21, 28, 2, 13, "l")
      .rect(17, 38, 6, 1, "w")
      .ellipse(16, 22, 8, 7, "i")
      .ellipse(18, 23, 3, 3, "r");
  return p.outline("o").grid();
}
function arm(): Grid {
  return (
    new Pixels(20, 38)
      // A bell sleeve, a gold cuff and a bare hand.
      .polygon(
        [
          [6, 1],
          [14, 1],
          [18, 22],
          [17, 27],
          [3, 27],
          [2, 22],
        ],
        "p",
      )
      .polygon(
        [
          [12, 2],
          [14, 2],
          [18, 22],
          [17, 26],
          [13, 26],
        ],
        "q",
      )
      .rect(6, 5, 2, 12, "r")
      .line(9, 8, 8, 22, "q")
      .rect(3, 24, 14, 3, "g")
      .rect(3, 24, 14, 1, "k")
      .ellipse(5, 27, 10, 9, "s")
      .ellipse(6, 28, 4, 3, "h")
      .rect(7, 33, 6, 1, "t")
      .outline("o")
      .grid()
  );
}
/** The somersault cloud: rolling puffs, lit from above, with a wisp trailing behind. */
function cloud(): Grid {
  const p = new Pixels(96, 26);
  for (const [x, y, w, h] of [
    [5, 8, 28, 17],
    [21, 3, 30, 22],
    [43, 5, 30, 20],
    [65, 9, 28, 16],
  ])
    p.ellipse(x, y, w, h, "b");
  for (const [x, y, w, h] of [
    [6, 8, 25, 12],
    [22, 3, 27, 15],
    [44, 5, 27, 14],
    [66, 9, 25, 11],
  ])
    p.ellipse(x, y, w, h, "a");
  for (const [x, y, w, h] of [
    [27, 5, 13, 4],
    [49, 7, 13, 4],
    [10, 10, 10, 3],
    [71, 11, 10, 3],
  ])
    p.ellipse(x, y, w, h, "c");
  return (
    p
      // Curls where the puffs meet.
      .line(21, 14, 24, 19, "b", 2)
      .line(43, 13, 46, 19, "b", 2)
      .line(65, 15, 68, 20, "b", 2)
      .polygon(
        [
          [1, 19],
          [9, 12],
          [10, 21],
        ],
        "b",
      )
      .outline("j")
      .grid()
  );
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
  const parts: Part[] = [
    part("tail", "body", 2, 72, tail()),
    part("staff", "body", 2, 44, staff()),
    part("left-leg", "leftLeg", 33, 94, leg()),
    part("right-leg", "rightLeg", 49, 94, leg()),
    part("torso", "body", 28, 60, torso("front"), {
      views: { back: torso("back") },
    }),
    part("left-arm", "leftArm", 19, 62, arm()),
    part("right-arm", "rightArm", 57, 62, arm()),
    part("head", "head", 23, 18, head("front"), {
      views: { right: head("right"), back: head("back") },
    }),
    part("expression", "head", 23, 18, face("normal"), {
      views: { back: [], right: face("normal", true) },
      expressions: {
        blink: face("blink"),
        closed: face("closed"),
        happy: face("happy"),
      },
      profileExpressions: {
        blink: face("blink", true),
        closed: face("closed", true),
        happy: face("happy", true),
      },
    }),
    part("circlet", "head", 16, -6, circlet("front"), {
      views: { right: circlet("right"), back: circlet("back") },
    }),
    part("cloud", "root", 0, 106, cloud(), { poses: CLOUD_POSES }),
  ];
  const character: PixelCharacter = {
    id: "wukong",
    name: "Wukong",
    title: "CLOUD RIDER",
    palette,
    parts,
    clips,
    detail: 2,
    traits: { movement: "fly" },
    lines: { pet: "Ha! Do that again.", play: "Catch me if you can!" },
    author: "LittleLife",
    license: "MIT",
  };
  validateCharacter(character);
  return character;
}

import { Pixels, part } from "./art";
import {
  POSES,
  validateCharacter,
  type Clip,
  type Expression,
  type Grid,
  type Palette,
  type Part,
  type PixelCharacter,
  type Pose,
} from "./engine";

/**
 * An original Monkey King after the old tale, drawn as a warrior rather than a
 * mascot: adult proportions, armour, a long tail and a staff, and a lunge on a
 * cloud whenever he takes to the air.
 *
 * He uses everything a character can bring: double detail, his own skeleton, his
 * own clips, art that appears only in some poses, a favourite way of moving and
 * his own lines.
 */
const palette: Palette = {
  o: "#1b1216",
  e: "#121015",
  // Fur.
  u: "#5d3524",
  n: "#3a2016",
  m: "#83502f",
  // Face and hands.
  s: "#d9a877",
  t: "#ad7b52",
  h: "#eecb9d",
  // Armour: the recolorable outfit.
  p: "#8f202c",
  q: "#5c1420",
  r: "#bd363f",
  // Scarf and sash: the recolorable accent.
  a: "#cf3d2e",
  b: "#8e2320",
  c: "#ec7350",
  g: "#dba63c",
  j: "#94661f",
  k: "#f7d67f",
  y: "#4f2c5a",
  x: "#33203f",
  d: "#76838f",
  f: "#aab7c3",
  i: "#a52b2b",
  l: "#6c1b1e",
  z: "#4fd197",
  w: "#f5f3ef",
  v: "#c6cbd8",
};
const AIRBORNE: readonly Pose[] = ["fly", "swim"];
const GROUNDED = POSES.filter((pose) => !AIRBORNE.includes(pose));
/** Poses in which the staff comes off his back and spins in his hands. */
const SPINNING: readonly Pose[] = ["jump", "dance"];
const SHEATHED = GROUNDED.filter((pose) => !SPINNING.includes(pose));
type Point = [number, number];

/** A limb or ribbon: one thick stroke through several points. */
function stroke(p: Pixels, points: Point[], thick: number, color: string) {
  for (let n = 1; n < points.length; n++)
    p.line(
      points[n - 1][0],
      points[n - 1][1],
      points[n][0],
      points[n][1],
      color,
      thick,
    );
  return p;
}
const shifted = (points: Point[], dx: number, dy: number): Point[] =>
  points.map(([x, y]) => [x + dx, y + dy]);

function head(back = false): Grid {
  const p = new Pixels(30, 32);
  // A swept-back mane.
  p.polygon(
    [
      [4, 16],
      [1, 9],
      [6, 11],
      [5, 3],
      [10, 8],
      [12, 1],
      [15, 7],
      [19, 1],
      [20, 8],
      [25, 3],
      [24, 11],
      [29, 9],
      [26, 17],
      [26, 25],
      [4, 25],
    ],
    "u",
  )
    .line(7, 8, 9, 13, "m")
    .line(13, 5, 14, 11, "m")
    .line(19, 5, 19, 11, "m")
    .line(4, 13, 5, 20, "n")
    .line(26, 13, 25, 20, "n");
  if (back)
    return p
      .polygon(
        [
          [6, 14],
          [24, 14],
          [22, 28],
          [8, 28],
        ],
        "u",
      )
      .line(11, 16, 12, 26, "n")
      .line(18, 16, 18, 26, "n")
      .line(15, 14, 15, 27, "m")
      .rect(7, 12, 16, 2, "g")
      .outline("o")
      .grid();
  return (
    p
      .ellipse(2, 15, 4, 6, "s")
      .ellipse(24, 15, 4, 6, "s")
      .ellipse(7, 11, 16, 18, "s")
      // Fur closes in over the brow and down the cheeks.
      .polygon(
        [
          [7, 11],
          [23, 11],
          [23, 15],
          [15, 18],
          [7, 15],
        ],
        "u",
      )
      .polygon(
        [
          [6, 15],
          [9, 16],
          [9, 26],
          [7, 23],
        ],
        "u",
      )
      .polygon(
        [
          [24, 15],
          [21, 16],
          [21, 26],
          [23, 23],
        ],
        "u",
      )
      .ellipse(10, 20, 10, 8, "h")
      .rect(11, 28, 8, 1, "t")
      // A gold circlet with a green stone.
      .rect(7, 11, 16, 2, "g")
      .rect(7, 11, 16, 1, "k")
      .rect(14, 10, 2, 3, "z")
      .outline("o")
      .grid()
  );
}
function face(expression: Expression): Grid {
  const p = new Pixels(30, 32);
  // Heavy brows drawn down toward the nose.
  p.line(9, 15, 13, 17, "n", 1).line(21, 15, 17, 17, "n", 1);
  if (expression === "normal")
    p.rect(10, 18, 4, 2, "w")
      .rect(16, 18, 4, 2, "w")
      .rect(12, 18, 2, 2, "z")
      .rect(16, 18, 2, 2, "z")
      .dot(13, 19, "e")
      .dot(16, 19, "e");
  else if (expression === "happy")
    p.line(10, 19, 12, 17, "o")
      .line(12, 17, 14, 19, "o")
      .line(16, 19, 18, 17, "o")
      .line(18, 17, 20, 19, "o");
  else p.rect(10, 19, 4, 1, "o").rect(16, 19, 4, 1, "o");
  p.dot(14, 22, "t").dot(16, 22, "t");
  if (expression === "happy") p.rect(12, 25, 6, 2, "o").rect(13, 25, 4, 1, "w");
  // A set mouth, one corner lifted.
  else p.rect(12, 25, 6, 1, "o").dot(18, 24, "o");
  return p.grid();
}
function torso(back = false): Grid {
  const p = new Pixels(46, 36);
  // A scarf wound round the neck, its end thrown over one shoulder.
  p.polygon(
    [
      [15, 1],
      [31, 1],
      [34, 7],
      [23, 11],
      [12, 7],
    ],
    "a",
  )
    .line(14, 6, 23, 9, "b", 2)
    .line(17, 2, 29, 2, "c");
  p.polygon(
    [
      [12, 5],
      [5, 10],
      [1, 18],
      [6, 15],
      [10, 10],
    ],
    "a",
  ).line(4, 13, 9, 9, "b");
  // Breastplate narrowing to the waist.
  p.polygon(
    [
      [9, 8],
      [37, 8],
      [39, 16],
      [34, 29],
      [12, 29],
      [7, 16],
    ],
    "p",
  )
    .polygon(
      [
        [30, 9],
        [37, 9],
        [38, 16],
        [34, 28],
        [29, 28],
      ],
      "q",
    )
    .polygon(
      [
        [12, 11],
        [21, 11],
        [20, 18],
        [13, 17],
      ],
      "r",
    )
    .line(23, 11, 23, 28, "q")
    .line(13, 21, 33, 21, "q")
    .line(14, 25, 32, 25, "q");
  if (back)
    p.rect(12, 10, 22, 18, "q")
      .line(23, 10, 23, 28, "p")
      .line(13, 18, 33, 18, "p");
  else p.line(9, 9, 37, 9, "g").line(23, 10, 23, 13, "g", 2);
  // Layered gold shoulder guards.
  for (const x of [1, 31])
    p.ellipse(x, 5, 14, 10, "g")
      .ellipse(x + 2, 6, 8, 3, "k")
      .line(x + 1, 12, x + 12, 12, "j", 2)
      .ellipse(x + 2, 12, 10, 5, "g")
      .line(x + 3, 16, x + 10, 16, "j");
  p.rect(12, 29, 22, 4, "g").rect(12, 29, 22, 1, "k").rect(12, 32, 22, 1, "j");
  if (!back) p.ellipse(20, 28, 6, 6, "j").rect(22, 30, 2, 2, "z");
  return p.outline("o").grid();
}
/** Cloth and plates hanging from the belt. */
function skirt(back = false): Grid {
  const p = new Pixels(34, 24);
  p.polygon(
    [
      [2, 1],
      [12, 1],
      [10, 17],
      [2, 13],
    ],
    "y",
  )
    .polygon(
      [
        [32, 1],
        [22, 1],
        [24, 17],
        [32, 13],
      ],
      "y",
    )
    .line(4, 3, 4, 12, "x")
    .line(29, 3, 29, 12, "x")
    .line(2, 13, 10, 17, "g")
    .line(32, 13, 24, 17, "g");
  p.polygon(
    [
      [11, 1],
      [23, 1],
      [24, 18],
      [17, 22],
      [10, 18],
    ],
    back ? "q" : "p",
  )
    .line(10, 18, 17, 22, "g")
    .line(24, 18, 17, 22, "g")
    .line(17, 3, 17, 18, back ? "p" : "q");
  if (!back) p.line(13, 4, 13, 15, "r");
  return p.outline("o").grid();
}
function arm(): Grid {
  return (
    new Pixels(16, 42)
      .polygon(
        [
          [4, 1],
          [12, 1],
          [12, 18],
          [5, 18],
        ],
        "u",
      )
      .line(6, 3, 6, 15, "m")
      .line(11, 3, 11, 16, "n")
      // A plated bracer from elbow to wrist.
      .polygon(
        [
          [3, 17],
          [13, 17],
          [12, 32],
          [4, 32],
        ],
        "p",
      )
      .line(11, 19, 11, 30, "q", 2)
      .line(6, 20, 6, 29, "r")
      .rect(3, 17, 10, 2, "g")
      .rect(4, 30, 8, 2, "g")
      .rect(3, 17, 10, 1, "k")
      .ellipse(4, 32, 8, 8, "u")
      .ellipse(5, 33, 4, 3, "m")
      .line(6, 38, 10, 38, "n")
      .outline("o")
      .grid()
  );
}
function leg(): Grid {
  return (
    new Pixels(18, 56)
      .polygon(
        [
          [3, 1],
          [15, 1],
          [14, 26],
          [5, 26],
        ],
        "y",
      )
      .line(12, 2, 12, 24, "x", 2)
      .line(6, 3, 7, 22, "x")
      // Knee guard, greave and a banded boot.
      .ellipse(4, 23, 10, 8, "g")
      .ellipse(6, 24, 5, 3, "k")
      .polygon(
        [
          [5, 30],
          [13, 30],
          [12, 46],
          [6, 46],
        ],
        "p",
      )
      .line(9, 31, 9, 45, "g")
      .line(12, 31, 11, 45, "q")
      .polygon(
        [
          [4, 45],
          [14, 45],
          [15, 51],
          [3, 51],
        ],
        "n",
      )
      .rect(4, 45, 10, 2, "g")
      .rect(3, 51, 13, 2, "o")
      .outline("o")
      .grid()
  );
}
function tail(): Grid {
  const p = new Pixels(36, 46);
  const curve: Point[] = [
    [35, 18],
    [25, 25],
    [14, 24],
    [7, 16],
    [8, 7],
    [14, 3],
  ];
  stroke(p, curve, 4, "u");
  stroke(p, shifted(curve.slice(0, 5), 0, -1), 1, "m");
  return p.ellipse(11, 0, 8, 7, "n").outline("o").grid();
}
function staff(): Grid {
  return new Pixels(78, 92)
    .line(4, 87, 73, 4, "i", 3)
    .line(5, 88, 74, 5, "l", 1)
    .line(4, 87, 12, 77, "g", 5)
    .line(65, 14, 73, 4, "g", 5)
    .line(3, 86, 11, 76, "k", 1)
    .line(64, 13, 72, 3, "k", 1)
    .line(12, 74, 16, 77, "j", 2)
    .line(61, 15, 65, 18, "j", 2)
    .outline("o")
    .grid();
}

/**
 * The staff in his hands, upright and centred so it can turn about its middle,
 * with a streak of light trailing each end.
 */
function spinningStaff(): Grid {
  const p = new Pixels(80, 80);
  for (const [from, sign] of [
    [-90, -1],
    [90, -1],
  ])
    for (let t = 6; t <= 46; t += 1) {
      const angle = ((from + sign * t) * Math.PI) / 180;
      const x = Math.round(40 + 33 * Math.cos(angle)),
        y = Math.round(40 + 33 * Math.sin(angle));
      // Bright near the tip, thinning out behind it.
      if (t < 30 || t % 2)
        p.rect(x, y, t < 18 ? 2 : 1, t < 18 ? 2 : 1, t < 24 ? "k" : "g");
    }
  const staff = new Pixels(80, 80)
    .rect(38, 6, 4, 68, "i")
    .rect(41, 6, 1, 68, "l")
    .rect(37, 5, 6, 10, "g")
    .rect(37, 65, 6, 10, "g")
    .rect(37, 5, 2, 10, "k")
    .rect(37, 65, 2, 10, "k")
    .rect(37, 16, 6, 2, "j")
    .rect(37, 62, 6, 2, "j")
    // Both fists closed round the middle.
    .ellipse(35, 33, 10, 7, "u")
    .ellipse(35, 41, 10, 7, "u")
    .rect(37, 34, 4, 2, "m")
    .rect(37, 42, 4, 2, "m")
    .outline("o")
    .grid();
  staff.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell !== ".") p.dot(x, y, cell);
    }),
  );
  return p.grid();
}

/**
 * In the air he is one drawing: a lunge to the right, staff levelled ahead,
 * tail and scarf streaming behind.
 */
function lunge(): Grid {
  const p = new Pixels(126, 88);
  // Streaming behind: tail and scarf.
  const tailCurve: Point[] = [
    [52, 46],
    [38, 44],
    [24, 36],
    [12, 34],
    [5, 40],
  ];
  stroke(p, tailCurve, 4, "u");
  stroke(p, shifted(tailCurve, 0, -1), 1, "m");
  p.ellipse(1, 37, 8, 7, "n");
  p.polygon(
    [
      [72, 20],
      [60, 12],
      [46, 12],
      [36, 18],
      [48, 17],
      [58, 19],
      [70, 25],
    ],
    "a",
  )
    .line(48, 14, 60, 15, "c")
    .line(40, 17, 56, 18, "b");
  // The trailing leg, stretched out behind.
  const backLeg: Point[] = [
    [54, 48],
    [40, 58],
    [26, 62],
  ];
  stroke(p, backLeg, 9, "y");
  stroke(p, shifted(backLeg, 0, 3), 2, "x");
  p.line(36, 56, 26, 60, "p", 8)
    .line(36, 55, 27, 58, "g", 1)
    .ellipse(36, 54, 9, 9, "g");
  p.polygon(
    [
      [28, 56],
      [18, 58],
      [12, 64],
      [16, 68],
      [28, 67],
    ],
    "n",
  ).line(27, 57, 27, 66, "g", 2);
  // The far arm, drawn back along the staff.
  stroke(
    p,
    [
      [70, 26],
      [60, 30],
      [52, 34],
    ],
    7,
    "u",
  );
  p.line(60, 30, 53, 33, "p", 7).line(60, 27, 54, 30, "g", 1);
  // The staff, levelled ahead.
  p.line(14, 30, 122, 44, "i", 3)
    .line(14, 32, 122, 46, "l", 1)
    .line(110, 42, 122, 44, "g", 5)
    .line(14, 30, 26, 32, "g", 5)
    .line(110, 41, 121, 42, "k", 1)
    .line(106, 40, 106, 46, "j", 2)
    .line(29, 30, 29, 36, "j", 2);
  p.ellipse(48, 30, 9, 9, "u").ellipse(49, 31, 4, 3, "m");
  // Torso, leaning into the charge.
  p.polygon(
    [
      [66, 20],
      [80, 26],
      [70, 46],
      [52, 52],
      [48, 42],
      [58, 28],
    ],
    "p",
  )
    .polygon(
      [
        [58, 30],
        [66, 22],
        [70, 24],
        [56, 44],
        [50, 44],
      ],
      "q",
    )
    .line(72, 30, 62, 46, "r", 2)
    .line(64, 28, 76, 33, "g")
    .line(55, 44, 68, 48, "g", 3)
    .line(55, 43, 68, 47, "k");
  // Cloth flying back from the belt.
  p.polygon(
    [
      [52, 46],
      [64, 50],
      [58, 62],
      [48, 66],
      [40, 60],
    ],
    "p",
  )
    .line(41, 60, 48, 65, "g")
    .line(48, 65, 58, 62, "g")
    .line(54, 50, 48, 61, "q");
  // The leading leg, knee driven forward.
  const frontLeg: Point[] = [
    [60, 50],
    [76, 58],
    [70, 72],
  ];
  stroke(p, frontLeg, 9, "y");
  p.line(62, 54, 74, 60, "x", 2);
  p.line(77, 60, 72, 72, "p", 8)
    .line(79, 61, 74, 72, "g", 1)
    .ellipse(72, 53, 10, 10, "g")
    .ellipse(74, 55, 5, 4, "k");
  p.polygon(
    [
      [66, 70],
      [78, 72],
      [84, 80],
      [80, 84],
      [64, 80],
    ],
    "n",
  ).line(66, 71, 78, 73, "g", 2);
  // The near arm, thrusting the staff forward.
  p.ellipse(66, 18, 16, 12, "g")
    .ellipse(69, 19, 9, 4, "k")
    .line(68, 27, 80, 28, "j", 2);
  stroke(
    p,
    [
      [76, 28],
      [86, 34],
      [94, 38],
    ],
    7,
    "u",
  );
  p.line(84, 33, 93, 38, "p", 8)
    .line(85, 30, 94, 35, "g", 1)
    .line(83, 36, 91, 41, "q", 2);
  p.ellipse(92, 35, 10, 10, "u").ellipse(94, 36, 4, 3, "m");
  // Head, low and forward, in profile.
  p.polygon(
    [
      [72, 16],
      [70, 8],
      [75, 10],
      [76, 2],
      [81, 7],
      [85, 1],
      [87, 7],
      [92, 4],
      [92, 11],
      [96, 20],
      [86, 26],
      [76, 24],
    ],
    "u",
  )
    .line(77, 6, 79, 11, "m")
    .line(84, 4, 85, 10, "m")
    .line(73, 12, 75, 20, "n")
    .polygon(
      [
        [84, 11],
        [94, 12],
        [99, 18],
        [98, 23],
        [90, 25],
        [84, 21],
      ],
      "s",
    )
    .ellipse(92, 17, 8, 7, "h")
    .line(84, 11, 94, 12, "g", 2)
    .line(84, 10, 94, 11, "k")
    .line(88, 14, 93, 15, "n")
    .rect(91, 15, 3, 2, "z")
    .dot(93, 16, "e")
    .line(93, 22, 97, 22, "o")
    .ellipse(80, 14, 5, 6, "s")
    .dot(82, 16, "t");
  return p.outline("o").grid();
}
/** A pale cloud, lit from above, tearing away behind him. */
function cloud(): Grid {
  const p = new Pixels(104, 26);
  for (const [x, y, w, h] of [
    [14, 9, 28, 16],
    [30, 3, 32, 22],
    [54, 6, 30, 19],
    [74, 11, 26, 14],
  ])
    p.ellipse(x, y, w, h, "v");
  for (const [x, y, w, h] of [
    [15, 9, 25, 11],
    [31, 3, 29, 15],
    [55, 6, 27, 13],
    [75, 11, 23, 9],
  ])
    p.ellipse(x, y, w, h, "w");
  return p
    .line(30, 15, 33, 20, "v", 2)
    .line(54, 14, 57, 20, "v", 2)
    .line(74, 16, 77, 21, "v", 2)
    .polygon(
      [
        [1, 16],
        [16, 12],
        [18, 21],
        [8, 19],
      ],
      "v",
    )
    .line(2, 16, 15, 13, "w")
    .outline("d")
    .grid();
}

const charge = (lift: number) => ({
  duration: 200,
  bones: { root: { y: lift } },
});
const glide = (lift: number) => ({
  duration: 520,
  bones: { root: { y: lift } },
});
/** Feet apart and settled, in place of the shared seat, which suits short legs only. */
const stance = (sink: number, nod: number, asleep: boolean) => ({
  duration: 800,
  ...(asleep ? { expression: "closed" as const } : {}),
  bones: {
    body: { y: sink },
    head: { angle: nod },
    leftLeg: { angle: 20 },
    rightLeg: { angle: -20 },
    leftArm: { angle: 12 },
    rightArm: { angle: -12 },
  },
});
/** Long legs take a shorter swing than the shared walk gives. */
const stride = (swing: number, lift: number) => ({
  duration: 140,
  bones: {
    body: { y: lift },
    leftLeg: { angle: swing },
    rightLeg: { angle: swing ? -swing : 0 },
    leftArm: { angle: swing ? -swing * 0.8 : 0 },
    rightArm: { angle: swing * 0.8 },
  },
});
/** A raised fist rather than open arms. */
const cheer = (reach: number, lift: number) => ({
  duration: 230,
  expression: "happy" as const,
  bones: {
    root: { y: lift },
    rightArm: { angle: reach },
    leftArm: { angle: 14 },
    head: { angle: -3 },
  },
});
const TURNS = [0, 45, 90, 135, 180, 225, 270, 315];
/** The staff whirling in front of him, hands together at its middle. */
const flourish: Clip = {
  frames: TURNS.map((angle, n) => ({
    duration: 70,
    ...(n % 4 === 2 ? { expression: "happy" as const } : {}),
    bones: {
      prop: { angle },
      body: { y: n % 4 < 2 ? 0 : 1 },
      leftArm: { angle: -23 },
      rightArm: { angle: 23 },
      leftLeg: { angle: 9 },
      rightLeg: { angle: -9 },
    },
  })),
};
/** The staff whirling above his head, knees bent, weight shifting in time. */
const overhead: Clip = {
  frames: TURNS.map((angle, n) => ({
    duration: 80,
    expression: "happy" as const,
    bones: {
      prop: { angle, y: -34 },
      body: { y: 4 },
      leftArm: { angle: 195 },
      rightArm: { angle: -195 },
      head: { angle: n < 4 ? -3 : 3 },
      leftLeg: { angle: n < 4 ? 24 : 18 },
      rightLeg: { angle: n < 4 ? -18 : -24 },
    },
  })),
};
const clips: Partial<Record<Pose, Clip>> = {
  jump: flourish,
  dance: overhead,
  fly: { frames: [charge(-2), charge(-4), charge(-3), charge(-1)] },
  swim: { frames: [glide(-1), glide(-3), glide(-2)] },
  sit: { frames: [stance(3, 0, false), stance(4, 0, false)] },
  sleep: { frames: [stance(4, 12, true), stance(5, 12, true)] },
  walk: {
    frames: [stride(11, -1), stride(0, 0), stride(-11, -1), stride(0, 0)],
  },
  happy: { frames: [cheer(-150, -1), cheer(-162, -2)] },
};

export function wukong(): PixelCharacter {
  const ground = { poses: GROUNDED };
  const parts: Part[] = [
    part("tail", "body", 6, 54, tail(), ground),
    part("staff", "body", 10, 18, staff(), { poses: SHEATHED }),
    part("left-leg", "leftLeg", 32, 68, leg(), ground),
    part("right-leg", "rightLeg", 46, 68, leg(), ground),
    part("skirt", "body", 31, 62, skirt(), {
      ...ground,
      views: { back: skirt(true) },
    }),
    part("torso", "body", 25, 32, torso(), {
      ...ground,
      views: { back: torso(true) },
    }),
    part("left-arm", "leftArm", 23, 38, arm(), ground),
    part("right-arm", "rightArm", 57, 38, arm(), ground),
    part("head", "head", 33, 6, head(), {
      ...ground,
      views: { back: head(true) },
    }),
    part("expression", "head", 33, 6, face("normal"), {
      ...ground,
      views: { back: [] },
      expressions: {
        blink: face("blink"),
        closed: face("closed"),
        happy: face("happy"),
      },
    }),
    part("spinning-staff", "prop", 8, 34, spinningStaff(), { poses: SPINNING }),
    part("cloud", "root", -4, 102, cloud(), { poses: AIRBORNE }),
    part("lunge", "body", -15, 26, lunge(), { poses: AIRBORNE }),
  ];
  const character: PixelCharacter = {
    id: "wukong",
    name: "Wukong",
    title: "CLOUD RIDER",
    palette,
    parts,
    clips,
    detail: 2,
    // A tall build: small head, long limbs.
    rig: {
      body: { x: 48, y: 64 },
      head: { x: 48, y: 36 },
      leftArm: { x: 31, y: 41 },
      rightArm: { x: 65, y: 41 },
      leftLeg: { x: 41, y: 70 },
      rightLeg: { x: 55, y: 70 },
      // Where his hands meet in front of him.
      prop: { x: 48, y: 74 },
    },
    traits: { movement: "fly" },
    lines: { pet: "Hm. Again.", play: "Try to keep up." },
    author: "LittleLife",
    license: "MIT",
  };
  validateCharacter(character);
  return character;
}

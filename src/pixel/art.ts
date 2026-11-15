import {
  type Grid,
  type Palette,
  type Part,
  type PixelCharacter,
  validateCharacter,
} from "./engine";

/** Original pixel art made from drawing instructions, not imported bitmap assets. */
export class Pixels {
  private cells: string[][];
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = Array.from({ length: height }, () =>
      Array<string>(width).fill("."),
    );
  }
  dot(x: number, y: number, color: string) {
    if (this.cells[y]?.[x] !== undefined) this.cells[y][x] = color;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.dot(i, j, color);
    return this;
  }
  ellipse(x: number, y: number, w: number, h: number, color: string) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (
          ((i + 0.5 - x - w / 2) / (w / 2)) ** 2 +
            ((j + 0.5 - y - h / 2) / (h / 2)) ** 2 <=
          1
        )
          this.dot(i, j, color);
    return this;
  }
  polygon(points: [number, number][], color: string) {
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i],
            [xj, yj] = points[j];
          if (
            yi > y + 0.5 !== yj > y + 0.5 &&
            x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi
          )
            inside = !inside;
        }
        if (inside) this.dot(x, y, color);
      }
    return this;
  }
  grid(): Grid {
    return this.cells.map((row) => row.join(""));
  }
}
export const base: Palette = {
  o: "#292534",
  s: "#e9b18d",
  t: "#b87c64",
  h: "#ffdbad",
  p: "#414a67",
  q: "#30384e",
  r: "#69728a",
  a: "#ab4356",
  b: "#743144",
  c: "#d46a72",
  g: "#d7a855",
  j: "#916a36",
  k: "#ffe0a0",
  w: "#dddce9",
  v: "#9695ad",
  f: "#f3f0ff",
  e: "#222131",
};
export const part = (
  id: string,
  bone: Part["bone"],
  x: number,
  y: number,
  pixels: Grid,
  extra: Partial<Part> = {},
): Part => ({ id, bone, x, y, pixels, ...extra });

function head(profile = false) {
  const p = new Pixels(24, 23);
  if (profile)
    return p
      .ellipse(5, 1, 17, 21, "o")
      .ellipse(6, 2, 15, 19, "s")
      .rect(7, 17, 10, 3, "t")
      .rect(20, 11, 3, 4, "s")
      .rect(21, 12, 2, 1, "h")
      .rect(6, 9, 3, 5, "t")
      .grid();
  return p
    .ellipse(0, 0, 24, 23, "o")
    .ellipse(1, 1, 22, 21, "s")
    .rect(3, 18, 18, 3, "t")
    .ellipse(2, 3, 8, 9, "h")
    .rect(0, 9, 2, 6, "t")
    .rect(22, 9, 2, 6, "t")
    .rect(11, 15, 2, 1, "t")
    .grid();
}
export function face(
  expression: "normal" | "blink" | "closed" | "happy",
  profile = false,
): Grid {
  const p = new Pixels(24, 23);
  const eyes = profile ? [17] : [6, 15];
  for (const x of eyes) {
    p.rect(x - 1, 9, 5, 1, "o");
    if (expression === "normal")
      p.rect(x, 11, 3, 5, "e")
        .dot(x, 11, "w")
        .dot(x + 2, 15, "v");
    else
      p.rect(x, 13, 4, 1, "e").dot(
        x + 3,
        expression === "happy" ? 12 : 14,
        "e",
      );
  }
  p.rect(profile ? 17 : 10, 18, profile ? 3 : 4, 1, "o");
  if (expression === "happy")
    p.rect(profile ? 18 : 11, 19, profile ? 1 : 2, 1, "t");
  return p.grid();
}
function hair(
  style: "scout" | "guard" | "sun",
  view: "front" | "right" | "back",
): Grid {
  const p = new Pixels(28, 27);
  if (style === "guard") {
    p.ellipse(1, 0, 26, 15, "o")
      .ellipse(2, 1, 24, 12, "q")
      .ellipse(4, 2, 20, 10, "p")
      .ellipse(6, 3, 13, 6, "r")
      .rect(3, 11, 22, 2, "g")
      .rect(4, 13, 3, 13, "q")
      .rect(21, 13, 3, 13, "q")
      .rect(5, 14, 1, 10, "k");
    if (view === "back") p.rect(4, 14, 20, 10, "q").rect(7, 17, 14, 6, "p");
    return p.grid();
  }
  p.polygon(
    [
      [1, 9],
      [3, 4],
      [9, 1],
      [21, 1],
      [26, 7],
      [27, 16],
      [23, 23],
      [20, 24],
      [21, 15],
      [8, 14],
      [7, 25],
      [3, 22],
    ],
    "o",
  );
  p.polygon(
    [
      [2, 9],
      [5, 4],
      [11, 2],
      [21, 2],
      [25, 8],
      [26, 15],
      [23, 19],
      [22, 11],
      [17, 12],
      [17, 8],
      [12, 12],
      [9, 9],
      [6, 18],
      [4, 20],
      [4, 12],
    ],
    "w",
  );
  p.polygon(
    [
      [3, 10],
      [7, 6],
      [8, 11],
      [12, 8],
      [13, 12],
      [17, 9],
      [20, 12],
      [24, 11],
      [24, 17],
      [22, 18],
      [20, 13],
      [16, 14],
      [15, 11],
      [11, 14],
      [8, 12],
      [6, 20],
      [4, 20],
    ],
    "v",
  );
  p.rect(8, 3, 8, 1, "f");
  if (view === "back")
    p.ellipse(3, 3, 22, 22, "v")
      .ellipse(4, 3, 19, 19, "w")
      .rect(8, 22, 13, 3, "v");
  if (view === "right") p.rect(3, 13, 6, 10, "v").rect(4, 3, 10, 10, "w");
  return p.grid();
}
export function eyesPart(): Part {
  return part("expression", "head", 12, 9, face("normal"), {
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
  });
}
function human(
  id: string,
  name: string,
  title: string,
  style: "scout" | "guard" | "sun",
  palette: Palette,
): PixelCharacter {
  const parts: Part[] = [];
  const cloak = new Pixels(28, 30)
    .polygon(
      [
        [6, 0],
        [22, 0],
        [27, 29],
        [15, 27],
        [1, 29],
      ],
      "o",
    )
    .polygon(
      [
        [7, 1],
        [21, 1],
        [25, 27],
        [14, 25],
        [3, 27],
      ],
      "b",
    )
    .polygon(
      [
        [9, 2],
        [18, 2],
        [21, 25],
        [15, 24],
        [6, 26],
      ],
      "a",
    )
    .rect(8, 5, 2, 17, "c")
    .grid();
  parts.push(part("cloak", "body", 10, 30, cloak));
  for (const [side, x] of [
    ["left", 17],
    ["right", 25],
  ] as const) {
    const leg = new Pixels(7, 14)
      .rect(1, 0, 5, 11, "o")
      .rect(2, 1, 3, 8, "q")
      .rect(2, 2, 2, 4, "p")
      .rect(0, 10, 7, 4, "o")
      .rect(1, 10, 5, 2, style === "sun" ? "s" : "a")
      .rect(1, 12, 5, 1, style === "sun" ? "t" : "b")
      .grid();
    parts.push(
      part(`${side}-leg`, side === "left" ? "leftLeg" : "rightLeg", x, 47, leg),
    );
  }
  const torso = new Pixels(18, 19)
    .polygon(
      [
        [3, 0],
        [15, 0],
        [18, 6],
        [16, 18],
        [2, 18],
        [0, 6],
      ],
      "o",
    )
    .polygon(
      [
        [4, 1],
        [14, 1],
        [17, 6],
        [15, 17],
        [3, 17],
        [1, 6],
      ],
      "p",
    )
    .rect(3, 6, 5, 7, "r")
    .rect(12, 4, 3, 11, "q")
    .rect(2, 15, 14, 3, "b")
    .rect(8, 15, 3, 3, "g")
    .dot(8, 15, "k")
    .grid();
  const back = new Pixels(18, 19)
    .rect(2, 0, 14, 18, "b")
    .rect(3, 1, 11, 16, "a")
    .rect(4, 3, 2, 12, "c")
    .grid();
  parts.push(part("torso", "body", 15, 31, torso, { views: { back } }));
  if (style === "sun") {
    const jewel = new Pixels(16, 15)
      .rect(2, 2, 12, 1, "g")
      .rect(3, 3, 2, 2, "k")
      .rect(11, 3, 2, 2, "k")
      .rect(5, 5, 6, 1, "g")
      .rect(6, 6, 4, 1, "j")
      .rect(7, 7, 2, 3, "g")
      .dot(7, 8, "c")
      .rect(0, 12, 16, 2, "g")
      .rect(5, 12, 5, 2, "k")
      .grid();
    parts.push(part("jewelry", "body", 16, 32, jewel, { views: { back: [] } }));
  }
  for (const [side, x] of [
    ["left", 10],
    ["right", 31],
  ] as const) {
    const arm = new Pixels(8, 18)
      .polygon(
        [
          [2, 0],
          [7, 1],
          [8, 15],
          [6, 18],
          [1, 17],
          [0, 6],
        ],
        "o",
      )
      .rect(2, 2, 4, 9, style === "sun" ? "s" : "p")
      .rect(2, 3, 2, 6, style === "sun" ? "h" : "r")
      .rect(1, 9, 6, 3, "g")
      .rect(2, 10, 3, 1, "k")
      .rect(2, 13, 4, 3, "s")
      .dot(2, 13, "h")
      .dot(5, 15, "t")
      .grid();
    parts.push(
      part(`${side}-arm`, side === "left" ? "leftArm" : "rightArm", x, 32, arm),
    );
  }
  parts.push(
    part("head", "head", 12, 9, head(), { views: { right: head(true) } }),
  );
  parts.push(eyesPart());
  parts.push(
    part("hair", "head", 10, 6, hair(style, "front"), {
      views: { back: hair(style, "back"), right: hair(style, "right") },
    }),
  );
  const scarf = new Pixels(22, 9)
    .polygon(
      [
        [0, 0],
        [5, 1],
        [16, 1],
        [22, 0],
        [20, 5],
        [15, 8],
        [5, 7],
        [1, 4],
      ],
      "b",
    )
    .polygon(
      [
        [1, 0],
        [6, 2],
        [16, 2],
        [21, 0],
        [19, 4],
        [14, 6],
        [5, 5],
        [2, 3],
      ],
      "a",
    )
    .rect(4, 3, 9, 1, "c")
    .grid();
  parts.push(part("scarf", "body", 13, 28, scarf));
  if (style === "scout") {
    parts.push(
      part(
        "scarf-tail",
        "body",
        30,
        32,
        new Pixels(6, 23)
          .polygon(
            [
              [0, 0],
              [5, 1],
              [5, 22],
              [1, 20],
            ],
            "b",
          )
          .rect(1, 1, 3, 18, "a")
          .rect(1, 2, 1, 14, "c")
          .grid(),
      ),
    );
    parts.push(
      part(
        "belt-pouch",
        "body",
        14,
        46,
        new Pixels(7, 7)
          .rect(0, 0, 7, 7, "o")
          .rect(1, 1, 5, 5, "g")
          .rect(2, 2, 3, 2, "j")
          .dot(3, 3, "k")
          .grid(),
      ),
    );
  }
  if (style === "guard") {
    const plume = new Pixels(18, 11)
      .polygon(
        [
          [1, 3],
          [5, 0],
          [15, 0],
          [18, 3],
          [15, 9],
          [8, 10],
          [7, 5],
          [0, 5],
        ],
        "b",
      )
      .polygon(
        [
          [2, 3],
          [6, 1],
          [14, 1],
          [16, 3],
          [13, 8],
          [9, 8],
          [8, 4],
        ],
        "a",
      )
      .rect(6, 2, 7, 1, "c")
      .grid();
    parts.push(part("plume", "head", 16, -1, plume));
    const shield = new Pixels(17, 23)
      .ellipse(0, 0, 17, 23, "o")
      .ellipse(1, 1, 15, 21, "j")
      .ellipse(2, 2, 13, 19, "p")
      .ellipse(3, 3, 10, 15, "r")
      .rect(7, 5, 3, 12, "j")
      .rect(4, 10, 9, 3, "j")
      .rect(7, 6, 2, 10, "k")
      .dot(7, 10, "g")
      .grid();
    parts.push(
      part("shield", "rightArm", 30, 37, shield, {
        views: { back: [] },
        attachments: {
          sleep: "root",
          sit: "root",
          jump: "body",
          happy: "body",
          fly: "body",
          dance: "body",
          angry: "body",
          swim: "root",
        },
      }),
    );
  }
  if (style === "sun") {
    const crown = new Pixels(28, 14)
      .polygon(
        [
          [0, 7],
          [3, 8],
          [3, 2],
          [7, 6],
          [11, 4],
          [14, 0],
          [17, 4],
          [21, 6],
          [25, 2],
          [25, 8],
          [28, 7],
          [26, 13],
          [2, 13],
        ],
        "j",
      )
      .polygon(
        [
          [2, 8],
          [5, 9],
          [5, 5],
          [8, 8],
          [12, 6],
          [14, 2],
          [16, 6],
          [20, 8],
          [23, 5],
          [23, 9],
          [26, 8],
          [24, 12],
          [4, 12],
        ],
        "g",
      )
      .rect(3, 10, 22, 2, "k")
      .rect(12, 8, 4, 4, "b")
      .rect(13, 8, 2, 3, "a")
      .dot(14, 8, "c")
      .grid();
    parts.push(part("crown", "head", 10, -1, crown));
    parts.push(
      part(
        "sash",
        "body",
        27,
        30,
        new Pixels(6, 25)
          .rect(0, 0, 6, 24, "b")
          .rect(1, 0, 4, 23, "a")
          .rect(1, 1, 1, 20, "c")
          .rect(1, 22, 4, 2, "g")
          .grid(),
      ),
    );
  }
  const character = { id, name, title, palette, parts };
  validateCharacter(character);
  return character;
}
function moss(): PixelCharacter {
  const palette = {
    ...base,
    p: "#a0bd7f",
    q: "#728f62",
    r: "#c4d69e",
    a: "#ca8490",
    b: "#9c6275",
    c: "#e8a5a9",
  };
  const body = new Pixels(28, 31)
    .ellipse(0, 0, 28, 30, "o")
    .ellipse(1, 1, 26, 28, "q")
    .ellipse(2, 1, 23, 26, "p")
    .ellipse(5, 4, 9, 5, "r")
    .grid();
  const faceGrid = (expression: "normal" | "blink" | "closed" | "happy") => {
    const p = new Pixels(28, 31)
      .rect(4, 18, 3, 2, "a")
      .rect(21, 18, 3, 2, "a")
      .rect(12, 22, 4, 1, "q");
    for (const x of [8, 19])
      if (expression === "normal") p.rect(x, 14, 2, 4, "e").dot(x, 14, "w");
      else
        p.rect(x - 1, 16, 4, 1, "e").dot(
          x - 1,
          expression === "happy" ? 15 : 17,
          "e",
        );
    return p.grid();
  };
  const parts: Part[] = [
    part(
      "left-foot",
      "leftLeg",
      14,
      51,
      new Pixels(9, 5).ellipse(0, 0, 9, 5, "q").rect(2, 0, 5, 2, "p").grid(),
    ),
    part(
      "right-foot",
      "rightLeg",
      25,
      51,
      new Pixels(9, 5).ellipse(0, 0, 9, 5, "q").rect(2, 0, 5, 2, "p").grid(),
    ),
    part(
      "left-arm",
      "leftArm",
      8,
      36,
      new Pixels(7, 9).ellipse(0, 0, 7, 9, "q").ellipse(1, 1, 5, 6, "p").grid(),
    ),
    part(
      "right-arm",
      "rightArm",
      33,
      36,
      new Pixels(7, 9).ellipse(0, 0, 7, 9, "q").ellipse(1, 1, 5, 6, "p").grid(),
    ),
    part("body", "body", 10, 24, body),
    part("face", "body", 10, 24, faceGrid("normal"), {
      views: { back: [] },
      expressions: {
        blink: faceGrid("blink"),
        closed: faceGrid("closed"),
        happy: faceGrid("happy"),
      },
    }),
    part(
      "leaf",
      "head",
      19,
      12,
      new Pixels(17, 15)
        .polygon(
          [
            [0, 14],
            [2, 6],
            [7, 0],
            [16, 0],
            [15, 7],
            [10, 11],
            [3, 13],
          ],
          "q",
        )
        .polygon(
          [
            [2, 11],
            [4, 5],
            [8, 1],
            [14, 1],
            [13, 6],
            [9, 9],
          ],
          "p",
        )
        .rect(5, 5, 5, 1, "r")
        .rect(0, 11, 2, 4, "q")
        .grid(),
    ),
  ];
  const character = {
    id: "moss",
    name: "Moss",
    title: "LEAF SPIRIT",
    palette,
    parts,
  };
  validateCharacter(character);
  return character;
}
export const CHARACTERS: readonly PixelCharacter[] = [
  moss(),
  human("ember", "Ember", "SKY SCOUT", "scout", { ...base }),
  human("aster", "Aster", "DAWN GUARD", "guard", {
    ...base,
    p: "#b98c43",
    q: "#79582d",
    r: "#e2b96b",
    a: "#b53d50",
    b: "#792536",
    c: "#dd6870",
    w: "#453344",
    v: "#2d2334",
  }),
  human("surya", "Surya", "SUN KEEPER", "sun", {
    ...base,
    p: "#df8b38",
    q: "#a8552f",
    r: "#f5b95b",
    a: "#bd4743",
    b: "#7b2c38",
    c: "#e97257",
    w: "#343047",
    v: "#242331",
    f: "#555169",
    s: "#cd8e67",
    t: "#925f4e",
    h: "#e9b187",
  }),
];

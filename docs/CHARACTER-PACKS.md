# Character packs

A character is one JSON file: its colors, its pixel parts, and optionally its own animations, favourite way of moving and a couple of lines. **A pack is data only.** It cannot contain code, load images or reach the network, and LittleLife rebuilds every pack field by field from checked values before using it.

## Using packs

Open **Characters ↗ → Pixel character workshop**.

- **Add a character…** reads a `.json` pack and switches to it. Packs stay on this device.
- **Share this one** saves the current character as a pack (the desktop app copies it to the clipboard instead). This works for built-in characters too, so the quickest way to make your own is to share one, edit it and add it back under a new `id`.
- **Remove** appears for characters you added.

Up to 12 packs are kept, each at most 200 kB. A pack that fails a check is refused with the reason, and nothing changes.

[`examples/pip.littlelife.json`](examples/pip.littlelife.json) is a small complete pack to start from: five parts, three views of the body, four expressions, a balloon that only appears when flying, and its own flying clip.

## The canvas and the rig

Everything is drawn on a 64 × 80 pixel canvas. Parts are positioned in a 48 × 64 authoring space that sits 8 pixels in from the left and 12 down from the top, so `x: 0, y: 0` is canvas pixel (8, 12). Keep a one-pixel empty margin around the canvas in every pose.

Each part hangs from one of seven bones. A pose moves and turns bones; parts follow.

| Bone | Pivot (authoring space) | Follows |
| --- | --- | --- |
| `root` | 0, 0 | — |
| `body` | 24, 43 | `root` |
| `head` | 24, 29 | `body` |
| `leftArm` | 15, 33 | `body` |
| `rightArm` | 33, 33 | `body` |
| `leftLeg` | 20, 48 | `root` |
| `rightLeg` | 28, 48 | `root` |

Feet rest at about `y: 61`. Parts are drawn in the order listed, later ones on top.

## Format

```jsonc
{
  "format": "littlelife.character", // required, exactly this
  "version": 1,                     // required
  "id": "pip",                      // 2–32 of a–z, 0–9, hyphen; starts with a letter; not a built-in id
  "name": "Pip",                    // 1–24 characters
  "title": "POCKET SPROUT",         // 1–28 characters
  "author": "…", "license": "…",    // optional, up to 80 characters each
  "palette": { "o": "#2b2a3a" },    // 1–40 single-character keys → #rrggbb
  "parts": [ /* 1–40 parts */ ],
  "clips": { /* optional */ },
  "traits": { "movement": "fly" },  // optional: walk, fly or swim
  "lines": { "pet": "…", "play": "…" } // optional, up to 60 characters each
}
```

Unknown fields are dropped, not kept.

### Palette

Any single character except `.` and whitespace can be a color key. Two keys are required because shared effects use them: **`a`** (the heart, anger mark and music note) and **`r`** (the sleeping Zs).

The workshop's color pickers repaint by role, so use these keys if you want your character to be recolorable: `p` outfit, `q` its shadow, `r` its highlight; `a` accent, `b` its shadow, `c` its highlight.

### Parts

```jsonc
{
  "id": "body",            // unique within the pack
  "bone": "body",
  "x": 14, "y": 38,        // whole numbers, top-left corner in authoring space
  "pixels": ["..oo..", ".oppo."], // rows of equal width; "." is transparent
  "views": { "right": [/* rows */], "back": [/* rows, or [] to hide */] },
  "expressions": { "blink": [], "closed": [], "happy": [] },
  "profileExpressions": { "blink": [], "closed": [], "happy": [] },
  "attachments": { "sleep": "root" }, // hang from another bone in one pose
  "poses": ["fly", "swim"]            // draw only in these poses
}
```

- **Views.** `pixels` is the front. `right` is the side view, mirrored automatically for left. `back` is the rear. A view that is missing falls back to the front; an empty list hides the part from that side.
- **Expressions** replace a part's pixels while blinking, with eyes closed, or happy. Give them to the part that holds the face. `profileExpressions` are the same for the side view.
- **`poses`** is how a character gets props that come and go: a cloud to ride, a balloon, wings.
- **`attachments`** keep something sensible when a limb swings, such as a shield that rests on the body while dancing.

### Clips

The twelve poses are `idle`, `walk`, `sleep`, `jump`, `curious`, `happy`, `sit`, `wave`, `fly`, `swim`, `dance` and `angry`. Every character gets the shared animation for each. A pack may replace any of them:

```jsonc
"clips": {
  "fly": {
    "frames": [ // 1–16 frames
      {
        "duration": 400,          // milliseconds, 60–5000
        "expression": "happy",    // optional: normal, blink, closed, happy
        "bones": { "root": { "y": -3 }, "body": { "angle": 4 }, "leftArm": { "angle": 120 } }
      }
    ]
  }
}
```

`x` and `y` shift a bone by up to 40 pixels; `angle` turns it in degrees around its pivot. Poses are discrete frames, not tweened, which is what keeps the pixels crisp.

### Traits and lines

`traits.movement` is how the character prefers to get around the desktop. Choosing the character switches the desktop app to that style; the person can still change it. `lines.pet` and `lines.play` replace what it says when petted or played with.

## How the pieces fit

| File | Role |
| --- | --- |
| `src/pixel/pack.ts` | The format: reading untrusted packs, writing packs, limits |
| `src/pixel/registry.ts` | Built-in and imported characters as one list; saving imports |
| `src/pixel/characters.ts` | The characters that ship with the app |
| `src/pixel/wukong.ts` | A built-in that uses every pack feature: own clips, a pose-only cloud, movement and lines |
| `src/pixel/engine.ts` | Rig, shared clips, composition |

Built-in characters go through the same door as imported ones: a test writes each to a pack and reads it back, and they must come out identical. Anything a built-in can do, a pack can do.

Imported packs are stored under `littlelife.packs.v1` in the app's local storage, separate from the pet's state. They are never uploaded.

## Not yet

- A drawing tool inside the app. For now a pack is edited as text, or generated by a script.
- New poses or bones beyond the shared set, sounds, and per-pack behavior rules.
- A gallery for finding other people's packs.

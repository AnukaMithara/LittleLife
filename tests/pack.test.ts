import { describe, expect, it } from "vitest";
import { BUILTIN } from "../src/pixel/characters";
import { compose, FACINGS, POSES } from "../src/pixel/engine";
import {
  LIMITS,
  PackError,
  parsePack,
  readPack,
  toPack,
  writePack,
} from "../src/pixel/pack";
import { Registry } from "../src/pixel/registry";

const pack = (changes: Record<string, unknown> = {}) => ({
  ...JSON.parse(writePack(BUILTIN.find((c) => c.id === "wukong")!)),
  id: "visitor",
  name: "Visitor",
  ...changes,
});
const text = (changes: Record<string, unknown> = {}) =>
  JSON.stringify(pack(changes));

describe("character packs", () => {
  it("carries every built-in character through a file unchanged", () => {
    for (const character of BUILTIN) {
      const copy = readPack(writePack(character));
      expect(copy).toEqual(character);
      for (const pose of POSES)
        for (const facing of FACINGS)
          expect(compose(copy, pose, facing, 250)).toEqual(
            compose(character, pose, facing, 250),
          );
    }
  });
  it("lets a character bring its own animation, pose-only parts, movement and lines", () => {
    const wukong = BUILTIN.find((c) => c.id === "wukong")!;
    expect(wukong.traits?.movement).toBe("fly");
    expect(wukong.lines?.pet).toBeTruthy();
    const cloud = wukong.parts.find((p) => p.id === "cloud")!;
    const without = {
      ...wukong,
      parts: wukong.parts.filter((p) => p !== cloud),
    };
    // The cloud is there in the air and gone on the ground.
    expect(compose(wukong, "fly", "right", 0)).not.toEqual(
      compose(without, "fly", "right", 0),
    );
    expect(compose(wukong, "walk", "right", 0)).toEqual(
      compose(without, "walk", "right", 0),
    );
    // His own flying clip, not the shared one.
    expect(compose(wukong, "fly", "right", 0)).not.toEqual(
      compose({ ...wukong, clips: undefined }, "fly", "right", 0),
    );
  });
  it("keeps only known fields, so a pack cannot smuggle anything else in", () => {
    const copy = parsePack(
      pack({ onload: "alert(1)", script: "<script>", __proto__: { x: 1 } }),
    ) as unknown as Record<string, unknown>;
    expect(Object.keys(copy).sort()).toEqual([
      "author",
      "clips",
      "detail",
      "id",
      "license",
      "lines",
      "name",
      "palette",
      "parts",
      "title",
      "traits",
    ]);
    expect(parsePack(pack({ name: "  Tab\there\n " })).name).toBe("Tab here");
    // Double detail allows grids twice as large; ordinary packs keep the usual limit.
    const wide = "o".repeat(100);
    const part = (pack().parts as Record<string, unknown>[])[0];
    expect(() =>
      parsePack(pack({ parts: [{ ...part, pixels: [wide] }] })),
    ).not.toThrow();
    expect(() =>
      parsePack(pack({ detail: 1, parts: [{ ...part, pixels: [wide] }] })),
    ).toThrow(/one width of 1 to 64/);
    expect(() => parsePack(pack({ detail: 3 }))).toThrow(
      /detail must be between 1 and 2/,
    );
  });
  it("explains what is wrong with a bad pack", () => {
    const parts = pack().parts as Record<string, unknown>[];
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ format: "something-else" }, /not a LittleLife character pack/],
      [{ version: 2 }, /version 2/],
      [{ id: "Bad Id" }, /id must be/],
      [{ name: "" }, /name must be 1 to 24/],
      [{ name: "x".repeat(25) }, /name must be 1 to 24/],
      [{ palette: { ...pack().palette, a: "red" } }, /must look like #a1b2c3/],
      [{ palette: { ...pack().palette, ab: "#000000" } }, /single characters/],
      [{ parts: [] }, /1 to 40 parts/],
      [{ parts: [{ ...parts[0], bone: "wing" }] }, /bone must be one of/],
      [{ parts: [{ ...parts[0], pixels: ["oo", "o"] }] }, /share one width/],
      [{ parts: [{ ...parts[0], pixels: ["??"] }] }, /not in the palette/],
      [{ parts: [{ ...parts[0], x: 1.5 }] }, /whole number/],
      [
        { parts: [{ ...parts[0], poses: ["teleport"] }] },
        /poses must be one of/,
      ],
      [{ parts: [parts[0], parts[0]] }, /unique/],
      [
        { clips: { teleport: { frames: [{ duration: 100 }] } } },
        /clips entry must be one of/,
      ],
      [{ clips: { fly: { frames: [] } } }, /1 to 16 frames/],
      [
        { clips: { fly: { frames: [{ duration: 0 }] } } },
        /between 60 and 5000/,
      ],
      [
        {
          clips: {
            fly: {
              frames: [{ duration: 100, bones: { body: { angle: 1e9 } } }],
            },
          },
        },
        /out of range/,
      ],
      [{ traits: { movement: "teleport" } }, /traits.movement/],
      [{ lines: { pet: "x".repeat(61) } }, /lines.pet/],
    ];
    for (const [changes, message] of cases)
      expect(
        () => parsePack(pack(changes)),
        JSON.stringify(changes).slice(0, 60),
      ).toThrow(message);
    for (const raw of [null, [], "pack", 7])
      expect(() => parsePack(raw)).toThrow(PackError);
    expect(() => readPack("{")).toThrow(/not valid JSON/);
    expect(() => readPack(" ".repeat(LIMITS.size + 1))).toThrow(/at most/);
  });
});

describe("character registry", () => {
  it("adds, replaces, removes and remembers imported characters", () => {
    const registry = new Registry(BUILTIN);
    expect(registry.all()).toHaveLength(BUILTIN.length);
    expect(registry.add(text()).id).toBe("visitor");
    expect(registry.isImported("visitor")).toBe(true);
    expect(registry.isImported("wukong")).toBe(false);
    registry.add(text({ name: "Renamed" }));
    expect(registry.all()).toHaveLength(BUILTIN.length + 1);
    expect(registry.get("visitor")?.name).toBe("Renamed");
    const restored = new Registry(BUILTIN, registry.serialize());
    expect(restored.get("visitor")?.name).toBe("Renamed");
    expect(restored.remove("visitor")).toBe(true);
    expect(restored.remove("wukong")).toBe(false);
    expect(restored.has("wukong") && !restored.has("visitor")).toBe(true);
  });
  it("protects built-in characters and limits how many packs are kept", () => {
    const registry = new Registry(BUILTIN);
    expect(() => registry.add(text({ id: "moss" }))).toThrow(/built-in/);
    for (let n = 0; n < LIMITS.packs; n++)
      registry.add(text({ id: `guest-${n}` }));
    expect(() => registry.add(text({ id: "one-too-many" }))).toThrow(
      /Remove one first/,
    );
    expect(registry.add(text({ id: "guest-0", name: "Again" })).name).toBe(
      "Again",
    );
  });
  it("survives damaged storage, dropping only what cannot be read", () => {
    for (const saved of ["{", "null", '{"a":1}'])
      expect(new Registry(BUILTIN, saved).all()).toHaveLength(BUILTIN.length);
    const saved = JSON.stringify([
      pack(),
      { format: "nope" },
      pack({ id: "moss" }),
      toPack({ ...parsePack(pack()), id: "second" }),
    ]);
    expect(
      new Registry(BUILTIN, saved)
        .all()
        .map((c) => c.id)
        .slice(BUILTIN.length),
    ).toEqual(["visitor", "second"]);
  });
});

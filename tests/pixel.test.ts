import { describe, expect, it } from "vitest";
import { BUILTIN as CHARACTERS } from "../src/pixel/characters";
import { restoreAppearance } from "../src/pixel/appearance";
import {
  clipFor,
  compose,
  detailOf,
  FACINGS,
  HEIGHT,
  POSES,
  recolor,
  samplePose,
  validateCharacter,
  WIDTH,
} from "../src/pixel/engine";

describe("pixel characters and shared poses", () => {
  it("validates all original parts and their palette references", () => {
    for (const character of CHARACTERS)
      expect(() => validateCharacter(character)).not.toThrow();
    const invalid = {
      ...CHARACTERS[0],
      parts: [{ ...CHARACTERS[0].parts[0], pixels: ["?"] }],
    };
    expect(() => validateCharacter(invalid)).toThrow("Missing palette");
    expect(() =>
      validateCharacter({
        ...CHARACTERS[0],
        parts: [{ ...CHARACTERS[0].parts[0], pixels: ["oo", "o"] }],
      }),
    ).toThrow("dimensions");
  });
  it("renders every direction and pose frame without clipping or invalid tokens", () => {
    for (const character of CHARACTERS)
      for (const pose of POSES)
        for (const facing of FACINGS) {
          let time = 0;
          for (const frame of clipFor(pose, character).frames) {
            const grid = compose(character, pose, facing, time + 1);
            const name = `${character.id}/${pose}/${facing}/${time}`;
            const wide = WIDTH * detailOf(character),
              high = HEIGHT * detailOf(character);
            expect(grid.length, name).toBe(high);
            expect(
              grid.every((row) => row.length === wide),
              name,
            ).toBe(true);
            expect(
              grid[0] +
                grid[high - 1] +
                grid.map((row) => row[0] + row[wide - 1]).join(""),
              name,
            ).toMatch(/^\.+$/);
            for (const token of new Set(grid.join("")))
              expect(
                token === "." || character.palette[token] !== undefined,
                name,
              ).toBe(true);
            expect(grid.join(""), name).not.toMatch(/^\.+$/);
            time += frame.duration;
          }
        }
  });
  it("creates mirrored profiles, a separate rear view, and pose-specific silhouettes", () => {
    for (const character of CHARACTERS) {
      const right = compose(character, "idle", "right", 0);
      expect(compose(character, "idle", "left", 0)).toEqual(
        right.map((row) => [...row].reverse().join("")),
      );
      expect(compose(character, "sleep", "front", 0)).not.toEqual(
        compose(character, "idle", "front", 0),
      );
      expect(compose(character, "walk", "front", 0)).not.toEqual(
        compose(character, "walk", "front", 141),
      );
      if (character.id !== "moss")
        expect(compose(character, "idle", "back", 0).join("")).not.toContain(
          "e",
        );
    }
  });
  it("keeps reduced motion deterministic and samples blink/clip boundaries", () => {
    expect(samplePose("walk", 140).index).toBe(1);
    expect(samplePose("walk", 560).index).toBe(0);
    expect(samplePose("idle", 4551).expression).toBe("blink");
    for (const pose of POSES)
      expect(compose(CHARACTERS[1], pose, "front", 99999, true)).toEqual(
        compose(CHARACTERS[1], pose, "front", 0, true),
      );
  });
  it("recolors palette roles without mutating original art or accepting invalid CSS", () => {
    const original = CHARACTERS[1].palette;
    const palette = recolor(original, "#000000", "#ffffff");
    expect(palette).toMatchObject({
      p: "#000000",
      q: "#000000",
      r: "#1e1e1e",
      a: "#ffffff",
      b: "#e1e1e1",
      c: "#ffffff",
    });
    expect(recolor(original, "url(https://example.com)")).toEqual(original);
    expect(original.p).not.toBe("#000000");
  });
  it("restores appearance safely while leaving old pet state independent", () => {
    for (const raw of [null, "{", "null", '{"version":99}'])
      expect(restoreAppearance(raw).character).toBe("moss");
    expect(
      restoreAppearance(
        '{"version":1,"character":"missing","facing":"other","primary":"red"}',
      ),
    ).toMatchObject({ character: "moss", facing: "auto", primary: undefined });
    expect(
      restoreAppearance(
        '{"version":1,"character":"surya","facing":"back","primary":"#abcdef"}',
      ),
    ).toMatchObject({ character: "surya", facing: "back", primary: "#abcdef" });
  });
});

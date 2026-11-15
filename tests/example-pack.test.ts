import { describe, expect, it } from "vitest";
// @ts-expect-error Vite reads the file as text; the compiler does not know the suffix.
import source from "../docs/examples/pip.littlelife.json?raw";
import { BUILTIN } from "../src/pixel/characters";
import {
  clipFor,
  compose,
  FACINGS,
  HEIGHT,
  POSES,
  WIDTH,
} from "../src/pixel/engine";
import { readPack } from "../src/pixel/pack";
import { Registry } from "../src/pixel/registry";

describe("the example pack in the documentation", () => {
  it("is a valid pack that can be added beside the built-in characters", () => {
    const registry = new Registry(BUILTIN);
    expect(registry.add(source as string)).toMatchObject({
      id: "pip",
      traits: { movement: "fly" },
    });
  });
  it("stays inside the canvas in every pose and direction", () => {
    const pip = readPack(source as string);
    const outside: string[] = [];
    for (const pose of POSES)
      for (const facing of FACINGS) {
        let time = 0;
        for (const frame of clipFor(pose, pip).frames) {
          const grid = compose(pip, pose, facing, time + 1);
          const edge =
            grid[0] +
            grid[HEIGHT - 1] +
            grid.map((row) => row[0] + row[WIDTH - 1]).join("");
          if (/[^.]/.test(edge)) outside.push(`${pose}/${facing}/${time}`);
          time += frame.duration;
        }
      }
    expect(outside).toEqual([]);
  });
});

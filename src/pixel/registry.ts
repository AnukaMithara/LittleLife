import { LIMITS, PackError, parsePack, readPack, toPack } from "./pack";
import type { PixelCharacter } from "./engine";

export const PACKS_KEY = "littlelife.packs.v1";

/** Every character the companion can be: those that ship with it, then imported packs. */
export class Registry {
  private imported: PixelCharacter[] = [];
  constructor(
    private builtin: readonly PixelCharacter[],
    saved: string | null = null,
  ) {
    try {
      const list: unknown = JSON.parse(saved ?? "[]");
      if (!Array.isArray(list)) return;
      for (const item of list.slice(0, LIMITS.packs)) {
        try {
          const character = parsePack(item);
          if (!this.has(character.id)) this.imported.push(character);
        } catch {
          // One damaged pack must not take the others with it.
        }
      }
    } catch {
      // Nothing saved that can be read; the built-in characters remain.
    }
  }
  all(): PixelCharacter[] {
    return [...this.builtin, ...this.imported];
  }
  get(id: string): PixelCharacter | undefined {
    return this.all().find((character) => character.id === id);
  }
  has(id: string): boolean {
    return this.get(id) !== undefined;
  }
  isImported(id: string): boolean {
    return this.imported.some((character) => character.id === id);
  }
  /** Add a pack from its file text, replacing an imported one with the same id. */
  add(source: string): PixelCharacter {
    const character = readPack(source);
    if (this.builtin.some((c) => c.id === character.id))
      throw new PackError(
        `"${character.id}" is a built-in character. Give the pack a different id.`,
      );
    const existing = this.imported.findIndex((c) => c.id === character.id);
    if (existing < 0 && this.imported.length >= LIMITS.packs)
      throw new PackError(
        `You can keep ${LIMITS.packs} imported characters. Remove one first.`,
      );
    if (existing < 0) this.imported.push(character);
    else this.imported[existing] = character;
    return character;
  }
  remove(id: string): boolean {
    const before = this.imported.length;
    this.imported = this.imported.filter((character) => character.id !== id);
    return this.imported.length < before;
  }
  /** What to keep between launches. */
  serialize(): string {
    return JSON.stringify(this.imported.map(toPack));
  }
}

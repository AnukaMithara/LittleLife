import { CHARACTERS } from "./art";
import { wukong } from "./wukong";
import type { PixelCharacter } from "./engine";

/** The characters that ship with LittleLife. Imported packs join them in the registry. */
export const BUILTIN: readonly PixelCharacter[] = [...CHARACTERS, wukong()];

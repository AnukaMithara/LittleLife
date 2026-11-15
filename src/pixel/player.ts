import {
  compose,
  detailOf,
  HEIGHT,
  WIDTH,
  recolor,
  samplePose,
  type Facing,
  type PixelCharacter,
  type Pose,
} from "./engine";

export interface PlayerState {
  character: PixelCharacter;
  pose: Pose;
  facing: Facing;
  primary?: string;
  accent?: string;
  paused: boolean;
  still: boolean;
}
/** One timer at 8 Hz, logical-pixel painting, no work while hidden/paused/still. */
export class PixelPlayer {
  private context: CanvasRenderingContext2D;
  private state?: PlayerState;
  private elapsed = 0;
  private lastTime = performance.now();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private key = "";
  private resize: ResizeObserver;
  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Pixel characters need Canvas 2D support.");
    this.context = context;
    this.context.imageSmoothingEnabled = false;
    this.resize = new ResizeObserver(() => this.fit());
    if (canvas.parentElement) this.resize.observe(canvas.parentElement);
    document.addEventListener("visibilitychange", this.visibility);
    this.fit();
  }
  setState(state: PlayerState) {
    if (
      this.state?.pose !== state.pose ||
      this.state.character.id !== state.character.id ||
      (state.still && !this.state.still)
    )
      this.elapsed = 0;
    // A detailed character has more pixels in the same space on screen.
    const k = detailOf(state.character);
    if (this.canvas.width !== WIDTH * k) {
      this.canvas.width = WIDTH * k;
      this.canvas.height = HEIGHT * k;
      this.context.imageSmoothingEnabled = false;
      this.key = "";
    }
    this.state = state;
    this.canvas.dataset.character = state.character.id;
    this.canvas.dataset.pose = state.pose;
    this.canvas.dataset.facing = state.facing;
    this.draw();
    this.schedule();
  }
  fit() {
    const available = this.canvas.parentElement?.clientWidth ?? WIDTH;
    const scale = Math.max(1, Math.min(4, Math.floor(available / WIDTH)));
    this.canvas.style.width = `${WIDTH * scale}px`;
    this.canvas.style.height = `${HEIGHT * scale}px`;
    this.canvas.dataset.scale = String(scale);
  }
  private visibility = () => {
    this.lastTime = performance.now();
    this.schedule();
  };
  private schedule() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.lastTime = performance.now();
    if (!this.state || this.state.paused || this.state.still || document.hidden)
      return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.elapsed += Math.min(250, performance.now() - this.lastTime);
      this.draw();
      this.schedule();
    }, 125);
  }
  private draw() {
    const s = this.state;
    if (!s) return;
    const sample = samplePose(s.pose, this.elapsed, s.still, s.character);
    const key = [
      s.character.id,
      s.pose,
      s.facing,
      s.primary,
      s.accent,
      sample.index,
      sample.expression,
    ].join(":");
    if (key === this.key) return;
    this.key = key;
    const pixels = compose(
      s.character,
      s.pose,
      s.facing,
      this.elapsed,
      s.still,
    );
    const palette = recolor(s.character.palette, s.primary, s.accent);
    const wide = this.canvas.width;
    this.context.clearRect(0, 0, wide, this.canvas.height);
    // Horizontal runs keep draw calls low, with exact integer edges at every scale.
    pixels.forEach((row, y) => {
      for (let x = 0; x < wide;) {
        const token = row[x];
        let end = x + 1;
        while (end < wide && row[end] === token) end++;
        if (token !== ".") {
          this.context.fillStyle = palette[token];
          this.context.fillRect(x, y, end - x, 1);
        }
        x = end;
      }
    });
    this.canvas.dataset.frame = String(sample.index);
  }
  dispose() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.resize.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
  }
}

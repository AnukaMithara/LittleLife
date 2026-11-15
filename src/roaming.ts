/** One native request at a time; no motion timer while stopped or hidden. */
export class Roamer {
  private active = false;
  private busy = false;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private step: () => Promise<number>,
    private turned: (direction: number) => void,
    private failed: (error: unknown) => void,
  ) {}
  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.schedule();
  }
  private schedule() {
    if (!this.active || this.busy || this.timer !== undefined) return;
    this.timer = setTimeout(() => void this.move(), 125);
  }
  private async move() {
    this.timer = undefined;
    if (!this.active) return;
    this.busy = true;
    const generation = this.generation;
    try {
      const direction = await this.step();
      if (this.active && generation === this.generation && direction)
        this.turned(direction);
    } catch (error) {
      if (generation === this.generation) {
        this.setActive(false);
        this.failed(error);
      }
    } finally {
      this.busy = false;
      this.schedule();
    }
  }
}

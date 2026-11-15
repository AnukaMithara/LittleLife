/** Tells the native side when to move. One request at a time, in order, and only on change. */
export class Roamer {
  private active = false;
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private roam: (active: boolean) => Promise<void>,
    private failed: (error: unknown) => void,
  ) {}
  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    const generation = ++this.generation;
    this.queue = this.queue
      .then(() => this.roam(active))
      .catch((error) => {
        // A failed stop needs no report; a failed start must not be retried every frame.
        if (!active || generation !== this.generation) return;
        this.active = false;
        this.failed(error);
      });
  }
}

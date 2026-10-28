import { Service, signal } from '@angular/core';

/** Ticks so time-based rules (expiry, Mark as Complete) refresh while a page stays open. */
@Service()
export class Clock {
  readonly now = signal(new Date());

  constructor() {
    setInterval(() => this.now.set(new Date()), 10_000);
  }
}

/**
 * Client-side Airbrake notifier. Initialized by AirbrakeProvider; use getAirbrake()
 * for manual reporting (e.g. in catch blocks). Unhandled errors are reported automatically.
 */
import type { Notifier } from "@airbrake/browser";

let notifier: Notifier | null = null;

export function setAirbrake(instance: Notifier | null): void {
  notifier = instance;
}

export function getAirbrake(): Notifier | null {
  return notifier;
}

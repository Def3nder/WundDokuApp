import { describe, expect, it } from "vitest";
import { radioZielIndex } from "./tastatur";

describe("radioZielIndex", () => {
  it("bewegt den Fokus vor und zurueck mit Umlauf", () => {
    expect(radioZielIndex("ArrowRight", 2, 3)).toBe(0);
    expect(radioZielIndex("ArrowDown", 0, 3)).toBe(1);
    expect(radioZielIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(radioZielIndex("ArrowUp", 2, 3)).toBe(1);
  });

  it("unterstuetzt Anfang und Ende", () => {
    expect(radioZielIndex("Home", 2, 4)).toBe(0);
    expect(radioZielIndex("End", 0, 4)).toBe(3);
  });

  it("ignoriert andere Tasten und ungueltige Gruppen", () => {
    expect(radioZielIndex("Tab", 0, 3)).toBeNull();
    expect(radioZielIndex("ArrowRight", 0, 0)).toBeNull();
  });
});

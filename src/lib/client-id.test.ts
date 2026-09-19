import { describe, expect, it, vi } from "vitest";
import { erzeugeClientId } from "./client-id";

describe("erzeugeClientId", () => {
  it("verwendet randomUUID, wenn der Browser die Funktion bereitstellt", () => {
    const randomUUID = vi.fn(() => "browser-uuid");

    expect(erzeugeClientId({ randomUUID })).toBe("browser-uuid");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("liefert ohne randomUUID unterschiedliche lokale IDs", () => {
    const erste = erzeugeClientId({});
    const zweite = erzeugeClientId({});

    expect(erste).toMatch(/^lokal-/);
    expect(zweite).toMatch(/^lokal-/);
    expect(zweite).not.toBe(erste);
  });
});

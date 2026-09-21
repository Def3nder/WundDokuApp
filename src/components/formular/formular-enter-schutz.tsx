"use client";

import { useEffect } from "react";

// Diese Eingabetypen können nach HTML-Spezifikation ein Formular implizit
// absenden. In WundDoku wird ausschließlich über eine bewusst aktivierte
// Absende-Schaltfläche gespeichert.
const IMPLIZITE_ABSENDE_FELDER = new Set([
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

export function FormularEnterSchutz() {
  useEffect(() => {
    function enterAbfangen(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.isComposing) return;
      const ziel = event.target;
      if (!(ziel instanceof HTMLInputElement) || !ziel.form) return;
      if (!IMPLIZITE_ABSENDE_FELDER.has(ziel.type)) return;
      event.preventDefault();
    }

    document.addEventListener("keydown", enterAbfangen, true);
    return () => document.removeEventListener("keydown", enterAbfangen, true);
  }, []);

  return null;
}

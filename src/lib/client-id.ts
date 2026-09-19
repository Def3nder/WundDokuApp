type CryptoMitOptionalerUuid = {
  randomUUID?: () => string;
};

let ersatzZaehler = 0;

/**
 * Erzeugt eine nur im aktuellen Browser benoetigte ID.
 *
 * `crypto.randomUUID()` fehlt unter anderem auf einigen iOS-Versionen und in
 * nicht sicheren HTTP-Kontexten. Fuer React-Keys und die lokale Fotoauswahl
 * genuegt dort eine kollisionsarme Ersatz-ID; sie wird nie gespeichert.
 */
export function erzeugeClientId(
  cryptoApi: CryptoMitOptionalerUuid | undefined = globalThis.crypto,
): string {
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  ersatzZaehler += 1;
  return `lokal-${Date.now().toString(36)}-${ersatzZaehler.toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

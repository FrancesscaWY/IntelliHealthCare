import { RuntimeLoader } from "@rive-app/canvas";
import riveWasmUrl from "@rive-app/canvas/rive.wasm?url";
import riveFallbackWasmUrl from "@rive-app/canvas/rive_fallback.wasm?url";

let runtimeConfigured = false;

export function ensureLocalRiveRuntime() {
  if (runtimeConfigured) {
    return;
  }

  RuntimeLoader.setWasmUrl(riveWasmUrl);
  RuntimeLoader.setWasmFallbackUrl(riveFallbackWasmUrl);
  runtimeConfigured = true;
}

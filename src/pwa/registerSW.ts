/**
 * PWA service worker registration with safety guards.
 *
 * - Disabled in dev, in iframes, and on Lovable preview hosts
 *   (the SW would otherwise cache stale builds inside the editor preview).
 * - On production deployments, registers with `prompt` strategy and exposes
 *   an `sw-update-available` window event for the UpdatePrompt component.
 * - Always cleans up any previously-registered SW in preview/iframe contexts
 *   so users who once visited a deployed build don't get stuck on it.
 */
import { toast } from "@/hooks/use-toast";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host === "localhost" ||
  host === "127.0.0.1";

const shouldDisableSW = isInIframe || isPreviewHost || import.meta.env.DEV;

export async function setupPWA() {
  if (!("serviceWorker" in navigator)) return;

  if (shouldDisableSW) {
    // Cleanup: remove any SW that was registered from a previous deployed visit.
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if (regs.length > 0) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));
      }
    } catch {
      // ignore
    }
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");

    let updateSWFn: ((reload?: boolean) => Promise<void>) | undefined;

    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(
          new CustomEvent("sw-update-available", {
            detail: {
              update: () => updateSWFn?.(true),
            },
          }),
        );
      },
      onOfflineReady() {
        toast({
          title: "Pronto para uso offline",
          description: "O SmartFlow agora funciona mesmo sem internet.",
        });
      },
      onRegisteredSW(_swUrl, registration) {
        // Check for updates every 30 minutes while the app is open.
        if (registration) {
          setInterval(
            () => {
              registration.update().catch(() => {});
            },
            30 * 60 * 1000,
          );
        }
      },
      onRegisterError(error) {
        console.error("[PWA] SW registration error:", error);
      },
    });
  } catch (error) {
    console.error("[PWA] setup failed:", error);
  }
}

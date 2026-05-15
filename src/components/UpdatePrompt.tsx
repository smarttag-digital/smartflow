import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Shows a non-blocking banner when a new SW version is ready.
 * Listens for the `sw-update-available` event dispatched by setupPWA.
 */
export default function UpdatePrompt() {
  const [updater, setUpdater] = useState<(() => void) | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ update: () => void }>).detail;
      setUpdater(() => detail.update);
    };
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!updater) return null;

  const handleUpdate = () => {
    setUpdating(true);
    try {
      updater();
    } catch {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 bg-card border border-primary/30 shadow-lg shadow-primary/10 rounded-xl px-4 py-3 backdrop-blur-md">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <RefreshCw className={`w-4 h-4 text-primary ${updating ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Nova versão disponível</p>
          <p className="text-xs text-muted-foreground truncate">
            {updating ? "Atualizando aplicativo..." : "Atualize agora para obter as últimas melhorias."}
          </p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Atualizar
        </button>
        <button
          onClick={() => setUpdater(null)}
          aria-label="Fechar"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

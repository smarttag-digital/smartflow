import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — prevents white-screen-of-death.
 * Auto-attempts SW update and reload as recovery.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleHardReset = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Encontramos um problema ao carregar esta tela. Tente recarregar o aplicativo.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 font-mono break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
            <button
              onClick={this.handleHardReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpar cache e recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface PrivacyContextType {
  presentationMode: boolean;
  togglePresentationMode: () => void;
  revealedKeys: Set<string>;
  reveal: (key: string, ms?: number) => void;
  isHidden: (key?: string) => boolean;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_KEY = "smartflow_presentation_mode";

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [presentationMode, setPresentationMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, presentationMode ? "1" : "0");
    } catch {
      // ignore
    }
  }, [presentationMode]);

  const togglePresentationMode = useCallback(() => {
    setPresentationMode((p) => !p);
    setRevealedKeys(new Set());
  }, []);

  const reveal = useCallback((key: string, ms = 5000) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    window.setTimeout(() => {
      setRevealedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, ms);
  }, []);

  const isHidden = useCallback(
    (key?: string) => {
      if (!presentationMode) return false;
      if (!key) return true;
      return !revealedKeys.has(key);
    },
    [presentationMode, revealedKeys]
  );

  return (
    <PrivacyContext.Provider value={{ presentationMode, togglePresentationMode, revealedKeys, reveal, isHidden }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used inside PrivacyProvider");
  return ctx;
}

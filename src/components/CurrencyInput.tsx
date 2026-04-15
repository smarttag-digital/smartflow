import { useState, useEffect } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBRL(display: string): number {
  const cleaned = display.replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function CurrencyInput({ value, onChange, className = "", placeholder }: CurrencyInputProps) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    // Format cents to display: value is stored as float (e.g. 168900.00)
    const cents = Math.round(value * 100);
    setDisplay(formatCents(cents));
  }, [value]);

  const formatCents = (cents: number): string => {
    if (cents === 0) return "";
    const v = cents / 100;
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setDisplay("");
      onChange(0);
      return;
    }
    const cents = parseInt(raw, 10);
    const floatVal = cents / 100;
    setDisplay(formatCents(cents));
    onChange(floatVal);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder || "0,00"}
        className={`pl-9 ${className}`}
      />
    </div>
  );
}

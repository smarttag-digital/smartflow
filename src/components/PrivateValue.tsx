import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface PrivateValueProps {
  value: string;
  /** Unique key to allow per-card reveal. If omitted, all hidden when presentation mode on. */
  revealKey?: string;
  /** Show the small inline eye toggle next to the value. */
  showToggle?: boolean;
  /** Mask string. Default R$ ••••••• */
  mask?: string;
  className?: string;
}

export default function PrivateValue({
  value,
  revealKey,
  showToggle = true,
  mask = "R$ •••••••",
  className = "",
}: PrivateValueProps) {
  const { isHidden, reveal, presentationMode } = usePrivacy();
  const hidden = isHidden(revealKey);

  if (!presentationMode) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{hidden ? mask : value}</span>
      {showToggle && revealKey && hidden && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); reveal(revealKey); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Mostrar por 5s"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}
      {showToggle && revealKey && !hidden && (
        <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60" />
      )}
    </span>
  );
}

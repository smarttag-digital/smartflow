import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed border-border/40 bg-card/30">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-primary/70" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

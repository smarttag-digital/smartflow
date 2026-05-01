import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Kanban, DollarSign, Home } from "lucide-react";

const ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Início" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/properties", icon: Home, label: "Imóveis" },
  { to: "/finance", icon: DollarSign, label: "$" },
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

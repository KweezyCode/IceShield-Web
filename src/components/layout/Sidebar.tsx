import Link from "next/link";
import { Shield, LayoutList, Gavel, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  showHeader?: boolean;
}

export function Sidebar({ className, onNavigate, showHeader = true }: SidebarProps) {
  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-card text-card-foreground", className)}>
      {showHeader && (
        <div className="flex h-14 items-center border-b px-4 font-bold text-xl">
          <Shield className="mr-2 h-6 w-6 text-primary" />
          IceShield
        </div>
      )}
      <nav className="flex-1 space-y-2 p-4">
        <Link
          href="/audit"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted"
          onClick={onNavigate}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          Журнал аудита
        </Link>
        <Link
          href="/bans"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted"
          onClick={onNavigate}
        >
          <Gavel className="mr-2 h-4 w-4" />
          Баны
        </Link>
        <Link
          href="/settings"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted"
          onClick={onNavigate}
        >
          <Settings className="mr-2 h-4 w-4" />
          Настройки
        </Link>
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        IceShield v2.0
      </div>
    </div>
  );
}

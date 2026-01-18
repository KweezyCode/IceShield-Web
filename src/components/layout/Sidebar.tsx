import Link from "next/link";
import { Shield, LayoutList, Gavel, Settings } from "lucide-react";

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-14 items-center border-b px-4 font-bold text-xl">
        <Shield className="mr-2 h-6 w-6 text-primary" />
        IceShield
      </div>
      <nav className="flex-1 space-y-2 p-4">
        <Link
          href="/audit"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <LayoutList className="mr-2 h-4 w-4" />
          Журнал аудита
        </Link>
        <Link
          href="/bans"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Gavel className="mr-2 h-4 w-4" />
          Баны
        </Link>
        <Link
          href="/settings"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
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

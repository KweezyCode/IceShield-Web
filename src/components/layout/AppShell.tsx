'use client';

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden transition-colors duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            IceShield
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Открыть меню"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>

      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          aria-label="Закрыть меню"
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-background/95 shadow-xl backdrop-blur transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              IceShield
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Sidebar
            className="h-full w-full border-r-0"
            onNavigate={() => setOpen(false)}
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
}

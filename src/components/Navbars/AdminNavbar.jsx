import React from "react";
import { Link } from "react-router-dom";
import { Menu, Network } from "lucide-react";

import { Button } from "@/components/ui/button";

function AdminNavbar({ brandText, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open navigation"
            className="lg:hidden"
            onClick={onMenuClick}
            size="icon"
            variant="outline"
          >
            <Menu />
          </Button>
          <Link className="flex min-w-0 items-center gap-3" to="/index">
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex">
              <Network className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {brandText}
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="size-2 rounded-full bg-emerald-500" />
          Public dataset
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;

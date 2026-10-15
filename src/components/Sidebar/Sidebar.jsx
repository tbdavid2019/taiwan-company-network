import React from "react";
import { NavLink } from "react-router-dom";
import {
  Bot,
  Building2,
  Clock3,
  ChevronRight,
  Network,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "context/CompanyContext";

const routeIcons = {
  Company: Building2,
  Graph: Network,
  Skill: Bot,
};

function Sidebar({ routes = [], isOpen, onClose }) {
  const { recentCompanies } = useCompany();

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation"
          className="app-navigation-backdrop fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-transform duration-200 lg:z-20 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink className="flex items-center gap-3" onClick={onClose} to="/index">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              <Network className="size-4" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">888台灣的公司關係網</span>
              <span className="block text-base text-slate-400">Entity explorer</span>
            </span>
          </NavLink>
          <Button
            aria-label="Close navigation"
            className="text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-base font-semibold uppercase tracking-[0.18em] text-slate-500">
            Explore
          </p>
          <nav className="space-y-1">
            {routes.filter((route) => route.name !== "Skill").map((route) => {
              const Icon = routeIcons[route.name] || ChevronRight;
              const label =
                route.name === "Company"
                  ? "Companies"
                  : route.name === "Graph"
                  ? "Network graph"
                  : "Agent Skill & WebMCP";
              return (
                <NavLink
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-colors ${
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                    }`
                  }
                  key={route.path}
                  onClick={onClose}
                  to={route.path}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`size-4 ${isActive ? "text-blue-300" : "text-slate-500"}`} />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {recentCompanies.length > 0 && (
            <div className="mt-8">
              <Separator className="mb-5 bg-white/10" />
              <div className="mb-2 flex items-center gap-2 px-3 text-base font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Clock3 className="size-3" /> Recent
              </div>
              <div className="space-y-1">
                {recentCompanies.map((entry) => (
                  <NavLink
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    key={entry.name}
                    onClick={onClose}
                    to={`/graph?company=${encodeURIComponent(entry.name)}`}
                  >
                    <Building2 className="size-3.5 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                    {entry.id && <span className="font-mono text-base text-slate-600">{entry.id}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}

export default Sidebar;

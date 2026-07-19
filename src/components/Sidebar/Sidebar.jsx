import React from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  Landmark,
  MapPin,
  Network,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "context/CompanyContext";

const routeIcons = {
  Company: Building2,
  Graph: Network,
};

function formatCapital(value) {
  if (value === undefined || value === null || value === "") return "—";
  return new Intl.NumberFormat("zh-TW").format(Number(value));
}

function Sidebar({ routes = [], isOpen, onClose }) {
  const { companyDetails, selectedCompany } = useCompany();

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-transform duration-200 lg:z-20 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink className="flex items-center gap-3" onClick={onClose} to="/index">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              <Network className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Taiwan Network</span>
              <span className="block text-[11px] text-slate-400">Entity explorer</span>
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
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Explore
          </p>
          <nav className="space-y-1">
            {routes.map((route) => {
              const Icon = routeIcons[route.name] || ChevronRight;
              return (
                <NavLink
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
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
                      <span className="flex-1">{route.name === "Company" ? "Companies" : "Network graph"}</span>
                      <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {companyDetails && (
            <div className="mt-8">
              <Separator className="mb-5 bg-white/10" />
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected entity
              </p>
              <Card className="border-white/10 bg-white/[0.06] text-slate-100 ring-0">
                <CardHeader className="gap-2 px-4 pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-sm text-white">
                      {selectedCompany || "Company"}
                    </CardTitle>
                    <Badge className="shrink-0 border-blue-400/20 bg-blue-400/10 text-blue-200" variant="outline">
                      Entity
                    </Badge>
                  </div>
                  <p className="font-mono text-[11px] text-slate-500">ID {companyDetails.id || "—"}</p>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 text-xs">
                  <div className="flex gap-2 text-slate-300">
                    <Landmark className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                    <span>Capital {formatCapital(companyDetails.資本總額)}</span>
                  </div>
                  <div className="flex gap-2 text-slate-300">
                    <UserRound className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                    <span className="line-clamp-2">{companyDetails.代表人姓名 || "Representative unavailable"}</span>
                  </div>
                  <div className="flex gap-2 text-slate-300">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                    <span className="line-clamp-3">{companyDetails.公司所在地 || "Address unavailable"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-slate-500">
          Ministry of Economic Affairs data
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

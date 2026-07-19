import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Menu, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadCompanyAliases, loadGraph } from "@/lib/companyData";

function AdminNavbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [graph, setGraph] = useState({});
  const [aliases, setAliases] = useState({});
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const company = searchParams.get("company") || "";

  useEffect(() => {
    let active = true;
    loadGraph().then((data) => active && setGraph(data)).catch(() => {});
    loadCompanyAliases().then((data) => active && setAliases(data)).catch(() => {});
    return () => { active = false; };
  }, []);

  const matches = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase();
    if (term.length < 2) return [];
    const results = [];
    const seen = new Set();
    const add = (name) => {
      if (name && !seen.has(name) && results.length < 8) {
        seen.add(name);
        results.push(name);
      }
    };
    Object.entries(aliases).forEach(([alias, records]) => {
      if (alias.toLocaleLowerCase().includes(term)) records.forEach(({ name }) => add(name));
    });
    for (const name of Object.keys(graph)) {
      if (name.toLocaleLowerCase().includes(term)) add(name);
      if (results.length >= 8) break;
    }
    return results;
  }, [aliases, deferredQuery, graph]);

  const openCompany = (name) => {
    setQuery("");
    navigate(`/graph?company=${encodeURIComponent(name)}`);
  };
  const isGraph = location.pathname.includes("/graph");

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button aria-label="Open navigation" className="lg:hidden" onClick={onMenuClick} size="icon" variant="outline"><Menu /></Button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
          <Link className="font-medium text-muted-foreground transition-colors hover:text-foreground" to="/index">Companies</Link>
          {isGraph && <><span className="text-muted-foreground">/</span><span className="text-muted-foreground">Relationship graph</span></>}
          {company && <><span className="text-muted-foreground">/</span><span className="max-w-52 truncate font-medium">{company}</span></>}
        </nav>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search another company"
            className="h-9 bg-background pl-9 pr-8"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) openCompany(matches[0]);
            }}
            placeholder="Search another company…"
            value={query}
          />
          {query && <Button aria-label="Clear company search" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground" onClick={() => setQuery("")} size="icon" variant="ghost"><X className="size-4" /></Button>}
          {matches.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
              {matches.map((name) => <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" key={name} onClick={() => openCompany(name)} type="button"><Building2 className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{name}</span></button>)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;

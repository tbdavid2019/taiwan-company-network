import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Database,
  Network,
  Search,
  X,
} from "lucide-react";

import Header from "components/Headers/Header.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { loadCompanyAliases, loadCompanyDetails, loadGraph } from "@/lib/companyData";
import { useCompany } from "context/CompanyContext";

function NetworkStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-lg font-semibold tracking-tight">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CompanyCard({ aliases, listing, name, connected, hasCompanyRecord, onClick }) {
  return (
    <button
      className="group flex w-full items-center justify-between gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{name || "Unnamed entity"}</span>
          {listing && <Badge className="shrink-0 font-mono text-[10px]" variant="secondary">{listing.code}</Badge>}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`} />
          {connected ? "Connected entity" : hasCompanyRecord ? "Company record" : "Indexed entity"}
        </span>
        {aliases.length > 0 && (
          <span className="mt-1 block truncate text-xs text-primary">{aliases.join(" · ")}</span>
        )}
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
    </button>
  );
}

function CompanyList() {
  const navigate = useNavigate();
  const { setCompanyDetails, setSelectedCompany } = useCompany();
  const [graph, setGraph] = useState({});
  const [details, setDetails] = useState({});
  const [aliases, setAliases] = useState({});
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setCompanyDetails(null);
    setSelectedCompany(null);
    let active = true;

    loadGraph()
      .then((graphData) => {
        if (active) setGraph(graphData);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load the network dataset.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    loadCompanyDetails()
      .then((detailsData) => {
        if (active) setDetails(detailsData);
      })
      .catch(() => {
        // The relationship index remains searchable if company details are unavailable.
      });

    loadCompanyAliases()
      .then((aliasData) => {
        if (active) setAliases(aliasData);
      })
      .catch(() => {
        // Alias matches are optional; registered names remain searchable.
      });

    return () => {
      active = false;
    };
  }, [setCompanyDetails, setSelectedCompany]);

  const entities = useMemo(() => {
    const graphNames = Object.keys(graph).filter(Boolean);
    const seen = new Set(graphNames);
    const detailOnlyNames = Object.keys(details).filter((name) => name && !seen.has(name));
    return [...graphNames, ...detailOnlyNames];
  }, [details, graph]);

  const stats = useMemo(() => {
    const connected = entities.filter((name) => {
      const node = graph[name];
      return node?.in?.length || node?.out?.length;
    }).length;
    return { total: entities.length, connected, companyRecords: Object.keys(details).length };
  }, [details, entities, graph]);

  const aliasesByName = useMemo(() => {
    const index = new Map();
    Object.entries(aliases).forEach(([alias, records]) => {
      records.forEach(({ name }) => {
        const current = index.get(name) || [];
        if (!current.includes(alias)) current.push(alias);
        index.set(name, current);
      });
    });
    return index;
  }, [aliases]);

  const listingsByName = useMemo(() => {
    const index = new Map();
    Object.values(aliases).forEach((records) => {
      records.forEach(({ code, market, name }) => {
        if (!code || !name) return;
        const current = index.get(name) || [];
        if (!current.some((record) => record.code === code && record.market === market)) {
          current.push({ code, market });
        }
        index.set(name, current);
      });
    });
    index.forEach((records) => records.sort((left, right) => left.code.localeCompare(right.code, "en", { numeric: true })));
    return index;
  }, [aliases]);

  const filteredEntities = useMemo(() => {
    const terms = deferredQuery
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matches = !terms.length ? [...entities] : entities.filter((name) => {
      const normalized = name.toLocaleLowerCase();
      const companyAliases = aliasesByName.get(name) || [];
      return terms.every((term) => (
        normalized.includes(term) || companyAliases.some((alias) => alias.toLocaleLowerCase().includes(term))
      ));
    });
    return matches.sort((left, right) => {
      const leftListing = listingsByName.get(left)?.[0];
      const rightListing = listingsByName.get(right)?.[0];
      if (Boolean(leftListing) !== Boolean(rightListing)) return leftListing ? -1 : 1;
      if (leftListing && rightListing) return leftListing.code.localeCompare(rightListing.code, "en", { numeric: true });
      return left.localeCompare(right, "zh-Hant");
    });
  }, [aliasesByName, deferredQuery, entities, listingsByName]);

  const openEntity = (name) => {
    setSelectedCompany(name);
    setCompanyDetails(details[name] || null);
    navigate(`/graph?company=${encodeURIComponent(name)}`);
  };

  return (
    <div className="fade-in">
      <Header
        description="Search the indexed network, then open an entity to inspect its direct relationships and two-hop neighbourhood."
        eyebrow="Network directory"
        title="Explore companies and relationships"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NetworkStat icon={Database} label="Searchable entities" value={stats.total} />
        <NetworkStat icon={Network} label="Connected entities" value={stats.connected} />
        <NetworkStat icon={Building2} label="Company records" value={stats.companyRecords} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-primary" />
                Company and entity index
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? `${filteredEntities.length.toLocaleString()} matches` : "Search company records and the relationship index"}
              </p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search entities"
                className="h-10 bg-background pl-9 pr-10"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(24);
                }}
                placeholder="Search by registered company name..."
                value={query}
              />
              {query && (
                <Button
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => {
                    setQuery("");
                    setVisibleCount(24);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <X />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton className="h-[68px] rounded-xl" key={index} />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredEntities.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No entities found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a shorter or different search term.</p>
            </div>
          )}

          {!isLoading && !error && filteredEntities.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEntities.slice(0, visibleCount).map((name) => {
                  const node = graph[name];
                  const connected = Boolean(node?.in?.length || node?.out?.length);
                  return (
                    <CompanyCard
                      aliases={aliasesByName.get(name) || []}
                      connected={connected}
                      hasCompanyRecord={Boolean(details[name])}
                      key={name}
                      listing={listingsByName.get(name)?.[0]}
                      name={name}
                      onClick={() => openEntity(name)}
                    />
                  );
                })}
              </div>
              {visibleCount < filteredEntities.length && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => setVisibleCount((count) => count + 24)}
                    variant="outline"
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Search includes company records and the relationship index.</span>
        <Badge className="hidden sm:inline-flex" variant="outline">Open data explorer</Badge>
      </div>
    </div>
  );
}

export default CompanyList;

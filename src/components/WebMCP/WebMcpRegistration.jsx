import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { loadCompanyAliases, loadCompanyDetails, loadGraph } from "@/lib/companyData";
import {
  buildCompanyToolIndex,
  createCompanyWebMcpTools,
  registerCompanyWebMcp,
  resolveWebMcpModelContext,
} from "@/lib/webmcp";

const STATUS_ATTRIBUTE = "data-webmcp";

function setWebMcpStatus(status, toolNames = [], api = "none") {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(STATUS_ATTRIBUTE, status);
  document.documentElement.setAttribute("data-webmcp-tools", toolNames.join(","));
  document.documentElement.setAttribute("data-webmcp-api", api);
}

function WebMcpRegistration() {
  const navigate = useNavigate();

  useEffect(() => {
    const { context: modelContext, api } = resolveWebMcpModelContext({
      documentObject: document,
      navigatorObject: navigator,
    });
    if (!modelContext) {
      setWebMcpStatus("unsupported", [], api);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setWebMcpStatus("loading", [], api);

    const onToolChange = () => {
      if (typeof modelContext.getTools === "function") {
        modelContext.getTools().then((tools) => {
          if (!active || !Array.isArray(tools)) return;
          const names = tools.map((t) => t.name || t);
          setWebMcpStatus("ready", names, api);
        }).catch(() => {});
      }
    };

    if (typeof modelContext.addEventListener === "function") {
      modelContext.addEventListener("toolchange", onToolChange, { signal: controller.signal });
    }

    Promise.all([loadGraph(), loadCompanyDetails(), loadCompanyAliases()])
      .then(([graph, details, aliases]) => {
        if (!active) return null;
        const index = buildCompanyToolIndex({ aliases, details, graph });
        const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
        const tools = createCompanyWebMcpTools(index, {
          baseUrl,
          onNavigate: ({ name }) => {
            navigate(`/graph?company=${encodeURIComponent(name)}`);
          },
        });
        return registerCompanyWebMcp(
          tools,
          modelContext,
          { signal: controller.signal },
        );
      })
      .then((result) => {
        if (!active || !result) return;
        setWebMcpStatus(result.error ? "error" : "ready", result.registered, api);
      })
      .catch(() => {
        if (active) setWebMcpStatus("error", [], api);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [navigate]);

  return null;
}

export default WebMcpRegistration;

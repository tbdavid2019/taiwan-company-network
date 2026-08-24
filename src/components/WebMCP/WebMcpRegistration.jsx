import { useEffect } from "react";

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

    Promise.all([loadGraph(), loadCompanyDetails(), loadCompanyAliases()])
      .then(([graph, details, aliases]) => {
        if (!active) return null;
        const index = buildCompanyToolIndex({ aliases, details, graph });
        const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
        return registerCompanyWebMcp(
          createCompanyWebMcpTools(index, { baseUrl }),
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
  }, []);

  return null;
}

export default WebMcpRegistration;

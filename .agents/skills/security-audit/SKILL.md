---
name: security-audit
description: Perform comprehensive full-codebase security audits, vulnerability assessments, secret detection, API/SSRF inspection, prompt injection defense, and dependency vulnerability scans for Web / React / Next.js / Static API applications.
license: MIT
metadata:
  author: taiwan-company-network
  version: "1.0"
---

# Security Audit Skill

This skill guides Antigravity agents in conducting end-to-end defensive security reviews and vulnerability assessments across Web/React applications, Static GET APIs, Docker containers, and LLM integrations.

---

## 🎯 Audit Scope & Objectives

When invoked, execute a structured 7-layer security assessment:

```
[Layer 1: Secrets & Env] ──> [Layer 2: API & SSRF] ──> [Layer 3: AI & Prompt Injection]
           │                                                    │
[Layer 4: Client & XSS] ───> [Layer 5: Dependencies] ──> [Layer 6: Headers & Infrastructure]
                                    │
                         [Layer 7: Quantitative & Math Safety]
```

---

## 📋 Step-by-Step Audit Procedure

### 1. 🔑 Secrets & Credentials Exposure
- Scan all tracked files and git history for hardcoded API keys, private IPs, fallback bearer tokens, or internal hostnames.
- Verify `.gitignore` rules cover `.env`, `.env.*`, `*.pem`, `*.key`, and build caches.
- Ensure all external service URLs and credentials are fed strictly via environment variables with safe fallback behaviors.

### 2. 🛡️ API Endpoints & Server Architecture (SSRF / DoS / Input Validation)
- **Parameter Validation**: Verify every route validates query and body payloads before processing.
- **SSRF Prevention**: Inspect all dynamic `fetch()` calls. Ensure URLs are strictly sanitized and validated against allowlists.
- **Rate Limiting & File Upload Limits**: Check endpoints accepting large payloads for abuse protection.
- **Error Information Leakage**: Verify catch blocks do not leak stack traces or internal microservice error details in production responses.

### 3. 🧠 AI & Prompt Injection Guardrails
- **Prompt Injection Defense**: Check where user input or third-party untrusted content is injected into LLM contexts.
- **Hallucination Mitigation**: Enforce explicit guardrails regarding relationship assertions, ownership claims, and privacy masking.
- **Model Output Validation**: Ensure LLM tool calling arguments are strictly typed and schema-validated.

### 4. 💻 Client-side Security & Data Storage
- **XSS & HTML Rendering**: Verify Markdown renderers and dynamic HTML do not execute unescaped raw HTML.
- **Dangerous HTML**: Audit all occurrences of `dangerouslySetInnerHTML` or `innerHTML`.
- **LocalStorage & Session Privacy**: Audit keys stored in browser storage (`localStorage`). Ensure sensitive tokens are not exposed.
- **Third-party Widgets**: Verify embedded external scripts are loaded over HTTPS and evaluated for supply chain risks.

### 5. 📦 Supply Chain & Dependency CVEs
- Execute `npm audit` to identify known CVEs in direct and transitive dependencies.
- Flag critical/high vulnerabilities and apply non-breaking upgrade paths.
- Inspect container base images (e.g. `Dockerfile`) for EOL or deprecated distributions.

### 6. 🌐 HTTP Security Headers & Infrastructure
- Verify server and build configurations include essential security response headers:
  - `X-Frame-Options: SAMEORIGIN` or `DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - `Strict-Transport-Security` (HSTS)
- Verify external domains and assets in CORS/CSP headers.

### 7. 📐 Quantitative & Numerical Safety
- Verify numerical formulas and geometric calculations guard against:
  - Division by zero
  - `NaN` / `Infinity` propagation
  - Negative values in logarithms / square roots
  - Array out-of-bounds indexing

---

## 📊 Deliverables & Reporting Format

Every audit run must produce a structured report containing:
1. **Executive Summary**: Overall risk score, summary of audited files, and critical finding counts.
2. **Detailed Findings Table**: Categorized by severity (`Critical`, `High`, `Medium`, `Low`, `Informational`), affected files (with clickable `file://` links), vulnerability descriptions, and proof of concept / root causes.
3. **Actionable Remediation Plan**: Immediate hotfixes, configuration adjustments, and dependency upgrades.

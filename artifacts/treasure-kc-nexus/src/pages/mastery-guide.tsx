import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";

const apiRoutes = [
  { method: "GET", path: "/api/healthz", auth: "Public", purpose: "Service health check." },
  { method: "GET", path: "/api/fresh_llcs", auth: "Public", purpose: "Public feed of fresh filing records." },
  { method: "GET", path: "/api/new_llcs", auth: "Public", purpose: "Filtered latest filings endpoint." },
  { method: "GET", path: "/api/llcs", auth: "Public", purpose: "List filings with pagination/filter support." },
  { method: "GET", path: "/api/llcs/:id", auth: "Public", purpose: "Single filing details." },
  { method: "POST", path: "/api/llcs/:id/recruit", auth: "Required", purpose: "Mark a filing as recruited + optional note." },
  { method: "POST", path: "/api/llcs/scrape", auth: "Required", purpose: "Trigger current manual scrape simulation." },
  { method: "POST", path: "/api/llcs/:id/outreach", auth: "Required", purpose: "Generate AI outreach message." },
  { method: "GET", path: "/api/dashboard/stats", auth: "Required", purpose: "Portal dashboard summary metrics." },
  { method: "GET", path: "/api/dashboard/recent-activity", auth: "Required", purpose: "Recent filing activity feed." },
  { method: "GET", path: "/api/dashboard/by-city", auth: "Required", purpose: "City-level filing counts." },
  { method: "GET", path: "/api/webhook/config", auth: "Public", purpose: "Current webhook config visibility." },
  { method: "POST", path: "/api/webhook/test", auth: "Public", purpose: "Test webhook delivery endpoint." },
  { method: "GET", path: "/api/worker/ingestion-runs", auth: "Required", purpose: "Ingestion monitoring snapshot + recent runs." },
];

const portalRoutes = [
  "/portal",
  "/portal/llcs",
  "/portal/llcs/:id",
  "/portal/scrape",
  "/portal/ingestion-status",
  "/portal/mastery-guide",
];

const dataTables = [
  "llc_filings (legacy prototype table still used by current dashboard + LLC endpoints)",
  "filings",
  "businesses",
  "business_locations",
  "source_records",
  "ingestion_runs",
  "workspaces",
  "members",
  "engagements",
  "communities",
  "business_communities",
  "outreach_messages",
  "outreach_deliveries",
  "audit_log",
];

const envVars = [
  { name: "PORT", scope: "Required", notes: "API server startup + Vite config validation." },
  { name: "BASE_PATH", scope: "Required for frontend builds", notes: "Must be set for Vite apps (e.g., /)." },
  { name: "DATABASE_URL", scope: "Required for DB operations", notes: "Used by Drizzle + DB package config." },
  { name: "NODE_ENV", scope: "Optional", notes: "development/test/production validation in API env." },
  { name: "LOG_LEVEL", scope: "Optional", notes: "Pino logger level control." },
  { name: "CLERK_SECRET_KEY", scope: "Optional in non-prod", notes: "Auth middleware and Clerk proxy behavior." },
  { name: "GROK_API_KEY", scope: "Required for outreach generation", notes: "Used by outreach route." },
  { name: "PORTAL_WEBHOOK_URL", scope: "Optional", notes: "Defaults to https://portaltreasurekc.org." },
  { name: "PORTAL_WEBHOOK_PATH", scope: "Optional", notes: "Defaults to /webhook/llcs and must start with /." },
  { name: "PORTAL_WEBHOOK_SECRET", scope: "Optional", notes: "Secret header for webhook fire." },
  { name: "INGESTION_HOUR_UTC", scope: "Optional", notes: "Worker scheduler target hour (default 6 UTC)." },
];

const scripts = [
  { package: "workspace", commands: ["pnpm run typecheck", "pnpm run build"] },
  { package: "@workspace/api-server", commands: ["pnpm --filter @workspace/api-server dev", "pnpm --filter @workspace/api-server build"] },
  { package: "@workspace/treasure-kc-nexus", commands: ["pnpm --filter @workspace/treasure-kc-nexus dev", "pnpm --filter @workspace/treasure-kc-nexus build"] },
  { package: "@workspace/data-worker", commands: ["pnpm --filter @workspace/data-worker test", "pnpm --filter @workspace/data-worker start"] },
  { package: "@workspace/db", commands: ["pnpm --filter @workspace/db generate", "pnpm --filter @workspace/db migrate", "pnpm --filter @workspace/db push"] },
  { package: "@workspace/api-spec", commands: ["pnpm --filter @workspace/api-spec run codegen"] },
];

export default function MasteryGuidePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 print:space-y-3 print:max-w-none">
      <div className="flex items-start justify-between gap-4 print:block">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portal Mastery Documentation</h2>
          <p className="text-muted-foreground mt-2">
            Full operator guide for this platform (architecture, data, API, workflows, deployment, and operations).
          </p>
          <p className="text-xs text-muted-foreground mt-2">Snapshot generated from current repository implementation.</p>
        </div>
        <Button className="print:hidden" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print Guide
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>1) Product and Platform Truth</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>Product position:</strong> trusted local business-and-community discovery network.</p>
          <p><strong>New business definitions:</strong> filed vs active vs operating are separate concepts.</p>
          <p><strong>Verified business:</strong> filing evidence + location evidence + recent last-seen from ingestion.</p>
          <p><strong>Initial focus:</strong> Kansas source priority and community-operator customer segment.</p>
          <p className="text-muted-foreground">Source: /docs/product-definitions.md</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2) System Architecture (Monorepo)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Applications</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>artifacts/api-server:</strong> Express API layer and integrations.</li>
              <li><strong>artifacts/treasure-kc-nexus:</strong> Main authenticated portal UI.</li>
              <li><strong>artifacts/data-worker:</strong> Ingestion pipeline, adapter, scheduler, tests.</li>
              <li><strong>artifacts/mockup-sandbox:</strong> Auxiliary UI sandbox.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Libraries</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>lib/db:</strong> Drizzle schema, migrations, upsert logic.</li>
              <li><strong>lib/api-spec:</strong> OpenAPI source of truth.</li>
              <li><strong>lib/api-zod:</strong> Generated runtime validation types.</li>
              <li><strong>lib/api-client-react:</strong> Generated React Query hooks and client types.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3) Portal Surfaces</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>All operator pages run under <Badge variant="secondary">/portal/*</Badge> behind Clerk sign-in.</p>
          <ul className="list-disc pl-5 space-y-1">
            {portalRoutes.map((route) => <li key={route}><code>{route}</code></li>)}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>4) API Contract Map</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Mounted under <code>/api</code>; routes implemented in <code>artifacts/api-server/src/routes</code>.</p>
          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">Method</th>
                  <th className="text-left p-2">Path</th>
                  <th className="text-left p-2">Auth</th>
                  <th className="text-left p-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {apiRoutes.map((r) => (
                  <tr key={`${r.method}${r.path}`} className="border-t">
                    <td className="p-2 font-medium">{r.method}</td>
                    <td className="p-2 font-mono">{r.path}</td>
                    <td className="p-2">{r.auth}</td>
                    <td className="p-2">{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>5) Data Model Inventory</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Current implementation contains both legacy and normalized tables during transition:</p>
          <ul className="list-disc pl-5 space-y-1">
            {dataTables.map((table) => <li key={table}><code>{table}</code></li>)}
          </ul>
          <p className="text-muted-foreground">Source: /lib/db/src/schema/llcs.ts and /lib/db/src/schema/business-network.ts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>6) Ingestion Vertical Slice (Kansas)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Source adapter interface: <code>artifacts/data-worker/src/connectors/source-adapter.ts</code></li>
            <li>Kansas fixture connector: <code>artifacts/data-worker/src/connectors/ks-llc-connector.ts</code></li>
            <li>Fixture records: <code>artifacts/data-worker/src/fixtures/ks-secretary-of-state.fixture.json</code></li>
            <li>Pipeline: fetch → archive raw source → parse/validate → upsert → run metrics.</li>
            <li>Idempotent upsert key: <code>(state, filing_id)</code>, with update path for source changes.</li>
            <li>Malformed records are isolated; source evidence is retained in <code>source_records</code>.</li>
            <li>Worker monitoring endpoint: <code>/api/worker/ingestion-runs</code>.</li>
            <li>Portal visibility page: <code>/portal/ingestion-status</code>.</li>
          </ul>
          <p className="text-muted-foreground">Source: /docs/ingestion-pipeline.md and /artifacts/data-worker/src/*</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>7) Environment Configuration</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Variable</th>
                <th className="text-left p-2">Scope</th>
                <th className="text-left p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((v) => (
                <tr key={v.name} className="border-t align-top">
                  <td className="p-2 font-mono">{v.name}</td>
                  <td className="p-2">{v.scope}</td>
                  <td className="p-2">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>8) Scripts and Operational Commands</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {scripts.map((row) => (
            <div key={row.package} className="border rounded-md p-3">
              <p className="font-semibold mb-2">{row.package}</p>
              <ul className="space-y-1">
                {row.commands.map((cmd) => <li key={cmd}><code>{cmd}</code></li>)}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>9) Security, Validation, and Delivery Controls</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Auth enforcement on protected routes via Clerk middleware and requireAuth checks.</li>
            <li>Centralized env validation for API runtime configuration.</li>
            <li>Supply-chain defense in workspace policy (<code>minimumReleaseAge</code> in pnpm workspace config).</li>
            <li>Dependency vulnerability checks integrated via advisory scanning.</li>
            <li>Secret scanning performed before committing modified files.</li>
            <li>Code quality validation through workspace typecheck/build and validation tooling.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>10) Replit, GitHub, and Working Model</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Current workflow preference: use Replit for UI iteration and GitHub-centered workflows for backend/data/ops.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Replit deployment target is autoscale in <code>.replit</code>.</li>
            <li>Frontend build requires <code>BASE_PATH</code>.</li>
            <li>Core source of truth remains repository + pull requests + CI validations.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>11) Print & Archive Instructions</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <code>/portal/mastery-guide</code> while signed in.</li>
            <li>Click <strong>Print Guide</strong> in the top right.</li>
            <li>Choose PDF or printer destination in your browser dialog.</li>
            <li>For long archives, save as PDF and version it as a periodic snapshot.</li>
          </ol>
          <p className="text-muted-foreground">
            This page is a living reference. As endpoints, schemas, or workflows evolve, update this guide in the same PR.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

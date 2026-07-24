import MarketingLayout, { SectionLabel } from '@/components/marketing/MarketingLayout';
import { getApiBaseUrl } from '@/lib/apiBase';

const API = getApiBaseUrl() || 'https://uzimax.onrender.com';

const CURL = `curl -X POST ${API}/api/v1/external/invoices \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceNumber": "INV-ERP-1001",
    "supplierPartyId": "<UZ-SUP-...>",
    "buyerPartyId": "<UZ-BUY-...>",
    "faceValue": 2500000,
    "currency": "KES",
    "issueDate": "2026-07-01",
    "dueDate": "2026-09-30",
    "description": "Confirmed payable from ERP / AfyaX"
  }'`;

export default function DocsPage() {
  return (
    <MarketingLayout>
      <section className="bg-white border-b border-[#E3E7E0]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Documentation</SectionLabel>
          <h1 className="font-display text-4xl font-extrabold text-[#0E1F1A]">Integrate with IOU Exchange</h1>
          <p className="mt-3 max-w-2xl text-[#5A6B60]">
            Programmatic invoice upload and status for buyers and partners (including AfyaX). API keys are issued at provisioning and stored as hashes.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8F5]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-16 space-y-12">
          <div>
            <h2 className="text-xl font-bold text-[#0E1F1A]">Authentication</h2>
            <p className="mt-2 text-sm text-[#5A6B60] leading-relaxed max-w-2xl">
              Send <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E3E7E0]">X-API-Key</code> on
              every request. Generate and revoke keys in the buyer portal under Profile → Developer. The plaintext key is shown once.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#0E1F1A]">Core endpoints</h2>
            <ul className="mt-4 space-y-2 text-sm text-[#5A6B60]">
              <li><span className="font-mono text-xs text-[#0E1F1A]">POST /api/v1/external/invoices</span> — submit invoice / IOU</li>
              <li><span className="font-mono text-xs text-[#0E1F1A]">GET /api/v1/invoices/:id/status</span> — status lookup</li>
              <li><span className="font-mono text-xs text-[#0E1F1A]">POST /api/v1/parties</span> — register buyer/supplier party</li>
              <li><span className="font-mono text-xs text-[#0E1F1A]">GET /api/v1/parties/:uzimaPartyId</span> — party lookup</li>
              <li><span className="font-mono text-xs text-[#0E1F1A]">POST /api/v1/webhooks/payment-update</span> — payment updates (scoped key)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#0E1F1A]">Sample request</h2>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#0E1F1A] p-5 text-[11px] sm:text-xs font-mono text-[#D3F36B]/90 leading-relaxed whitespace-pre">
              {CURL}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#0E1F1A]">OpenAPI</h2>
            <p className="mt-2 text-sm text-[#5A6B60]">
              Full machine-readable spec lives in the repository at <code className="font-mono text-xs">docs/openapi.yaml</code>.
              Ask your IOU Exchange contact for a Postman collection after onboarding.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

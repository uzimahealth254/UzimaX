#!/usr/bin/env node
/** POST a sample invoice to the local AFIX API using the demo buyer key. */

const API_BASE = process.env.VITE_API_BASE_URL || process.env.API_BASE || "http://localhost:8787";
const API_KEY = process.env.AFIX_DEMO_API_KEY || "afix_demo_kbc_7f3a9c2e1b";

const payload = {
  invoiceNumber: `INV-SAMPLE-${Date.now()}`,
  supplierOrgId: "org-supplier-1",
  amount: 1850000,
  currency: "KES",
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
  description: "Sample upload from scripts/sample-upload.mjs",
};

const res = await fetch(`${API_BASE}/api/v1/invoices`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!res.ok) {
  console.error("Upload failed:", res.status, body);
  process.exit(1);
}

console.log("Created invoice:", JSON.stringify(body, null, 2));

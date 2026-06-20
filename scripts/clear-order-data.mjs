import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allRowsFilter = "00000000-0000-0000-0000-000000000000";

async function clearTable(table) {
  const { error, count } = await admin
    .from(table)
    .delete({ count: "exact" })
    .neq("id", allRowsFilter);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function main() {
  const orderItems = await clearTable("order_items");
  const orders = await clearTable("orders");
  const serviceRequests = await clearTable("service_requests");
  const sessions = await clearTable("table_sessions");

  console.log("Order data cleared (menu and tables preserved):");
  console.log(`  order_items:       ${orderItems}`);
  console.log(`  orders:            ${orders}`);
  console.log(`  service_requests:  ${serviceRequests}`);
  console.log(`  table_sessions:    ${sessions}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

import type { TableBill } from "@/types/order";
import { formatOrderTotal } from "@/types/order";

export type BillSortOrder = "newest" | "oldest";
export type BillSortField = "paid_date" | "order_date";

const ACCENT = "#b45309";

export function getBillSortDate(
  bill: TableBill,
  field: BillSortField = "paid_date",
) {
  if (field === "order_date") {
    const firstOrder = bill.orders[0]?.createdAt;
    const lastOrder = bill.orders[bill.orders.length - 1]?.createdAt;
    return lastOrder ?? firstOrder ?? "";
  }

  return bill.paidAt ?? bill.orders[bill.orders.length - 1]?.createdAt ?? "";
}

export function sortBills(
  bills: TableBill[],
  order: BillSortOrder,
  field: BillSortField = "paid_date",
) {
  return [...bills].sort((a, b) => {
    const aTime = new Date(getBillSortDate(a, field)).getTime();
    const bTime = new Date(getBillSortDate(b, field)).getTime();
    return order === "newest" ? bTime - aTime : aTime - bTime;
  });
}

function startOfDay(isoDate: string) {
  const date = new Date(isoDate);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(isoDate: string) {
  const date = new Date(isoDate);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function filterBillsByDateRange(
  bills: TableBill[],
  from: string | undefined,
  to: string | undefined,
  field: BillSortField = "paid_date",
) {
  if (!from && !to) return bills;

  return bills.filter((bill) => {
    const sortDate = getBillSortDate(bill, field);
    if (!sortDate) return false;

    const time = new Date(sortDate).getTime();
    if (from && time < startOfDay(from)) return false;
    if (to && time > endOfDay(to)) return false;
    return true;
  });
}

export function formatBillDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortBillRef(sessionId: string) {
  return sessionId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function billLineItemsHtml(bill: TableBill, currency: string) {
  return bill.orders
    .map((order, index) => {
      const roundHeader =
        bill.orders.length > 1
          ? `<div class="round-header"><span class="round-label">Round ${index + 1}</span><span class="round-time">${escapeHtml(formatBillDate(order.createdAt))}</span></div>`
          : "";

      const items = order.items
        .map(
          (item) => `
            <div class="item-row">
              <span class="item-qty">${item.quantity}×</span>
              <span class="item-name">${escapeHtml(item.name)}</span>
              <span class="item-price">${escapeHtml(formatOrderTotal(item.priceCents * item.quantity, currency))}</span>
            </div>`,
        )
        .join("");

      return `<div class="order-block">${roundHeader}<div class="items">${items}</div></div>`;
    })
    .join("");
}

const PRINT_HEAD = `
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
`;

const PRINT_STYLES = `
  :root {
    --ink: #1a1a1a;
    --muted: #6b6b6b;
    --line: #e8e4df;
    --accent: ${ACCENT};
    --paper: #fdfcfa;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Inter", system-ui, sans-serif;
    color: var(--ink);
    background: #f3f0eb;
    padding: 32px 16px;
    overflow-x: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .receipt {
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 4px;
    box-shadow: 0 24px 48px rgba(26, 26, 26, 0.08);
    overflow: hidden;
  }

  .receipt-top {
    height: 4px;
    background: linear-gradient(90deg, var(--accent), #d97706, var(--accent));
  }

  .receipt-body {
    padding: 28px 24px 20px;
    overflow: hidden;
  }

  .eyebrow {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent);
    text-align: center;
    margin-bottom: 10px;
  }

  .restaurant-name {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.6rem;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.02em;
    line-height: 1.2;
    color: var(--ink);
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .table-badge {
    display: inline-block;
    margin: 14px auto 0;
    padding: 5px 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink);
    text-align: center;
    width: fit-content;
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ornament {
    text-align: center;
    color: var(--muted);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    margin: 16px 0;
    overflow: hidden;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 4px;
  }

  .meta-cell {
    text-align: center;
  }

  .meta-label {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 3px;
  }

  .meta-value {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--ink);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .divider {
    height: 1px;
    background: var(--line);
    margin: 18px 0;
  }

  .divider-dashed {
    height: 0;
    border: none;
    border-top: 1px dashed #d4cfc8;
    margin: 20px 0;
  }

  .items-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .order-block + .order-block {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }

  .round-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .round-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .round-time {
    font-size: 0.65rem;
    color: var(--muted);
  }

  .item-row {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) auto;
    column-gap: 10px;
    align-items: start;
    padding: 6px 0;
    font-size: 0.84rem;
    line-height: 1.4;
    width: 100%;
  }

  .item-qty {
    font-weight: 600;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .item-name {
    min-width: 0;
    font-weight: 500;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .item-price {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    text-align: right;
    white-space: nowrap;
    padding-left: 8px;
  }

  .total-block {
    background: #f7f4ef;
    padding: 18px 24px 22px;
    border-top: 1px solid var(--line);
    overflow: hidden;
  }

  .subtotal-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 10px;
    width: 100%;
  }

  .subtotal-row span:last-child {
    text-align: right;
    white-space: nowrap;
  }

  .total-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: end;
    width: 100%;
  }

  .total-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 4px;
  }

  .total-amount {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.65rem;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
    text-align: right;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-row {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .paid {
    background: #ecfdf3;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .paid .status-dot { background: #22c55e; }

  .unpaid {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .unpaid .status-dot { background: #f59e0b; }

  .footer {
    text-align: center;
    padding: 18px 24px 22px;
    border-top: 1px solid var(--line);
    overflow: hidden;
  }

  .footer-thanks {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1rem;
    font-style: italic;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .footer-brand {
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #b0aaa2;
  }

  /* Report styles */
  .report-wrap {
    max-width: 640px;
    margin: 0 auto;
  }

  .report-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .report-title {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 2rem;
    font-weight: 600;
  }

  .report-sub {
    font-size: 0.8rem;
    color: var(--muted);
    margin-top: 6px;
  }

  .bill-section {
    page-break-inside: avoid;
    margin-bottom: 24px;
  }

  .bill-section .receipt {
    max-width: 100%;
  }

  .grand-total-card {
    width: 100%;
    max-width: 360px;
    margin: 28px auto 0;
    padding: 18px 22px;
    background: var(--ink);
    color: #fff;
    border-radius: 4px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .grand-total-card span:first-child {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .grand-total-card span:last-child {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
    .report-wrap { max-width: 100%; }
  }
`;

function receiptShell({ title, body }: { title: string; body: string }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${PRINT_HEAD}
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

export function buildSingleBillPrintHtml({
  bill,
  restaurantName,
  currency,
}: {
  bill: TableBill;
  restaurantName: string;
  currency: string;
}) {
  const tableLabel = bill.tableLabel ? `Table ${bill.tableLabel}` : "Walk-in";
  const sortDate = getBillSortDate(bill);
  const statusClass = bill.paymentStatus === "paid" ? "paid" : "unpaid";
  const statusLabel = bill.paymentStatus === "paid" ? "Paid" : "Unpaid";
  const billRef = shortBillRef(bill.sessionId);

  const body = `
    <div class="receipt">
      <div class="receipt-top"></div>
      <div class="receipt-body">
        <div class="header-center">
          <p class="eyebrow">Guest bill</p>
          <h1 class="restaurant-name">${escapeHtml(restaurantName)}</h1>
          <span class="table-badge">${escapeHtml(tableLabel)}</span>
        </div>

        <p class="ornament">— ✦ —</p>

        <div class="meta-grid">
          <div class="meta-cell">
            <p class="meta-label">Date</p>
            <p class="meta-value">${escapeHtml(formatBillDate(sortDate))}</p>
          </div>
          <div class="meta-cell">
            <p class="meta-label">Bill ref</p>
            <p class="meta-value">#${billRef}</p>
          </div>
          <div class="meta-cell">
            <p class="meta-label">Items</p>
            <p class="meta-value">${bill.itemCount}</p>
          </div>
          <div class="meta-cell">
            <p class="meta-label">Orders</p>
            <p class="meta-value">${bill.orderCount}</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="items-header">
          <span>Item</span>
          <span>Amount</span>
        </div>

        ${billLineItemsHtml(bill, currency)}

        <div class="divider-dashed"></div>
      </div>

      <div class="total-block">
        <div class="subtotal-row">
          <span>Subtotal (${bill.itemCount} items)</span>
          <span>${escapeHtml(formatOrderTotal(bill.totalCents, currency))}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Amount due</span>
          <span class="total-amount">${escapeHtml(formatOrderTotal(bill.totalCents, currency))}</span>
        </div>
        <div class="status-row">
          <span class="status ${statusClass}">
            <span class="status-dot"></span>
            ${statusLabel}
          </span>
        </div>
      </div>

      <div class="footer">
        <p class="footer-thanks">Thank you for dining with us</p>
        <p class="footer-brand">Powered by Tabli</p>
      </div>
    </div>`;

  return receiptShell({
    title: `Bill — ${escapeHtml(tableLabel)}`,
    body,
  });
}

export function buildBillsReportPrintHtml({
  bills,
  restaurantName,
  currency,
  title,
}: {
  bills: TableBill[];
  restaurantName: string;
  currency: string;
  title: string;
}) {
  const sections = bills
    .map((bill) => {
      const tableLabel = bill.tableLabel ? `Table ${bill.tableLabel}` : "Walk-in";
      const sortDate = getBillSortDate(bill);
      const statusClass = bill.paymentStatus === "paid" ? "paid" : "unpaid";

      return `
        <section class="bill-section">
          <div class="receipt">
            <div class="receipt-top"></div>
            <div class="receipt-body">
              <div class="header-center">
                <p class="eyebrow">${escapeHtml(title)}</p>
                <h2 class="restaurant-name" style="font-size:1.35rem">${escapeHtml(tableLabel)}</h2>
              </div>
              <p class="ornament">— ✦ —</p>
              <div class="meta-grid" style="grid-template-columns:1fr 1fr 1fr">
                <div class="meta-cell">
                  <p class="meta-label">Date</p>
                  <p class="meta-value">${escapeHtml(formatBillDate(sortDate))}</p>
                </div>
                <div class="meta-cell">
                  <p class="meta-label">Status</p>
                  <p class="meta-value">${bill.paymentStatus.toUpperCase()}</p>
                </div>
                <div class="meta-cell">
                  <p class="meta-label">Total</p>
                  <p class="meta-value">${escapeHtml(formatOrderTotal(bill.totalCents, currency))}</p>
                </div>
              </div>
              <div class="divider"></div>
              ${billLineItemsHtml(bill, currency)}
            </div>
            <div class="total-block" style="margin:0">
              <div class="status-row">
                <span class="status ${statusClass}">
                  <span class="status-dot"></span>
                  ${bill.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </section>`;
    })
    .join("");

  const grandTotal = bills.reduce((sum, bill) => sum + bill.totalCents, 0);

  const body = `
    <div class="report-wrap">
      <div class="report-header">
        <p class="eyebrow">${escapeHtml(title)}</p>
        <h1 class="report-title">${escapeHtml(restaurantName)}</h1>
        <p class="report-sub">${bills.length} bill${bills.length === 1 ? "" : "s"} · Generated ${escapeHtml(formatBillDate(new Date().toISOString()))}</p>
      </div>
      ${sections}
      <div class="grand-total-card">
        <span>Grand total</span>
        <span>${escapeHtml(formatOrderTotal(grandTotal, currency))}</span>
      </div>
      <div class="footer" style="margin-top:24px;border:none">
        <p class="footer-brand">Powered by Tabli</p>
      </div>
    </div>`;

  return receiptShell({ title: escapeHtml(title), body });
}

export function printHtmlDocument(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      window.setTimeout(() => {
        iframe.contentWindow?.print();
        URL.revokeObjectURL(url);
        window.setTimeout(() => iframe.remove(), 1000);
      }, 400);
    };
    return;
  }

  printWindow.addEventListener("load", () => {
    window.setTimeout(() => {
      printWindow.print();
      URL.revokeObjectURL(url);
    }, 350);
  });
}

export function printBill(
  bill: TableBill,
  restaurantName: string,
  currency: string,
) {
  printHtmlDocument(
    buildSingleBillPrintHtml({ bill, restaurantName, currency }),
  );
}

export function printBillsReport(
  bills: TableBill[],
  restaurantName: string,
  currency: string,
  title: string,
) {
  printHtmlDocument(
    buildBillsReportPrintHtml({ bills, restaurantName, currency, title }),
  );
}

export function downloadBillsCsv({
  bills,
  restaurantName,
  currency,
  filename,
}: {
  bills: TableBill[];
  restaurantName: string;
  currency: string;
  filename: string;
}) {
  const header = [
    "Date",
    "Table",
    "Items",
    "Orders",
    "Total",
    "Status",
    "Paid At",
  ];

  const rows = bills.map((bill) => {
    const date = getBillSortDate(bill);
    return [
      formatBillDate(date),
      bill.tableLabel ?? "Walk-in",
      String(bill.itemCount),
      String(bill.orderCount),
      formatOrderTotal(bill.totalCents, currency),
      bill.paymentStatus,
      bill.paidAt ? formatBillDate(bill.paidAt) : "",
    ];
  });

  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${restaurantName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBillsPdf({
  bills,
  restaurantName,
  currency,
  title,
}: {
  bills: TableBill[];
  restaurantName: string;
  currency: string;
  title: string;
}) {
  printBillsReport(bills, restaurantName, currency, title);
}

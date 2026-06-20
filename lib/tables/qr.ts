import QRCode from "qrcode";

export function buildTableGuestUrl(
  origin: string,
  slug: string,
  label: string,
  token: string,
) {
  return `${origin}/r/${slug}?table=${encodeURIComponent(label)}&t=${token}`;
}

export async function generateTableQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 280,
    color: { dark: "#3d3428", light: "#ffffff" },
  });
}

export function openPrintableQrSheet({
  restaurantName,
  tables,
  origin,
  slug,
}: {
  restaurantName: string;
  tables: { label: string; zone: string | null; qrToken: string; dataUrl: string }[];
  origin: string;
  slug: string;
}) {
  const cards = tables
    .map(
      (table) => `
      <article class="card">
        <img src="${table.dataUrl}" alt="QR for ${table.label}" />
        <h2>${table.label}</h2>
        ${table.zone ? `<p class="zone">${table.zone}</p>` : ""}
        <p class="hint">Scan to view menu &amp; order</p>
      </article>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${restaurantName} — Table QR codes</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      color: #2f2a24;
      background: #faf8f5;
    }
    header { text-align: center; margin-bottom: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 4px; }
    .sub { color: #6b6358; font-size: 0.875rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .card {
      background: white;
      border: 1px solid #e8e2d8;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    img { width: 160px; height: 160px; display: block; margin: 0 auto 12px; }
    h2 { font-size: 1.125rem; margin: 0; }
    .zone { margin: 4px 0 0; font-size: 0.8125rem; color: #6b6358; }
    .hint { margin: 8px 0 0; font-size: 0.75rem; color: #8a8175; }
    @media print {
      body { background: white; padding: 12px; }
      .grid { gap: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${restaurantName}</h1>
    <p class="sub">Table QR codes · ${slug}</p>
  </header>
  <div class="grid">${cards}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }

  win.addEventListener("load", () => {
    window.setTimeout(() => {
      win.print();
    }, 300);
  });

  win.addEventListener("afterprint", () => {
    URL.revokeObjectURL(url);
    win.close();
  });

  return true;
}

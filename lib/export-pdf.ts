import type { Client, Appointment, Staff } from "./types";
import { getTier, TIER_META, pointsToRupees, type LoyaltySettings } from "./loyalty";

function fmtCur(n: number) {
  return "Rs. " + n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateLong() {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #f4f5f7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    background: #fff;
    max-width: 860px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 40px rgba(0,0,0,0.10);
  }

  /* ── Header ─────────────────────────────────────────── */
  .header {
    background: linear-gradient(135deg, #5B21B6 0%, #9333EA 100%);
    padding: 32px 40px 28px;
    color: #fff;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .avatar {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(255,255,255,0.20);
    border: 3px solid rgba(255,255,255,0.40);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 800; color: #fff;
    flex-shrink: 0;
  }
  .header-name { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
  .header-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .badge {
    display: inline-block; padding: 3px 12px; border-radius: 20px;
    font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.20);
    color: #fff; border: 1px solid rgba(255,255,255,0.30);
  }
  .badge-gold { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .badge-silver { background: #f1f5f9; color: #374151; border-color: #e2e8f0; }
  .badge-platinum { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
  .badge-active { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
  .badge-inactive { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .header-meta { font-size: 12px; color: rgba(255,255,255,0.80); line-height: 1.8; }
  .header-right { text-align: right; flex-shrink: 0; }
  .salon-name { font-size: 16px; font-weight: 800; color: #fff; }
  .report-type { font-size: 11px; color: rgba(255,255,255,0.70); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
  .report-date { font-size: 11px; color: rgba(255,255,255,0.70); margin-top: 16px; }

  /* ── Body ──────────────────────────────────────────── */
  .body { padding: 32px 40px 40px; }

  /* ── Section heading ─────────────────────────────── */
  .section-title {
    font-size: 11px; font-weight: 800; color: #9898b0;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin: 28px 0 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #f0f0f8; }

  /* ── Stat grid ───────────────────────────────────── */
  .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .stat-card {
    background: #f7f7fb;
    border-radius: 12px;
    padding: 16px 18px;
    border: 1px solid #ebebf4;
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent, #7C3AED);
  }
  .stat-val { font-size: 22px; font-weight: 900; color: var(--accent, #7C3AED); line-height: 1.1; margin-bottom: 4px; }
  .stat-lbl { font-size: 10px; font-weight: 700; color: #9898b0; text-transform: uppercase; letter-spacing: 0.06em; }
  .stat-sub { font-size: 10px; color: #b0b0c8; margin-top: 2px; }

  /* ── Info row ─────────────────────────────────────── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ebebf4; border-radius: 12px; overflow: hidden; }
  .info-item { padding: 12px 16px; border-bottom: 1px solid #f0f0f8; }
  .info-item:nth-last-child(-n+2) { border-bottom: none; }
  .info-item:nth-child(odd) { border-right: 1px solid #f0f0f8; }
  .info-label { font-size: 10px; font-weight: 700; color: #b0b0c8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .info-value { font-size: 13px; color: #1a1a2e; font-weight: 600; }

  /* ── Loyalty card ─────────────────────────────────── */
  .loyalty-card {
    border-radius: 12px; padding: 18px 20px;
    border: 1px solid #ebebf4; background: #f7f7fb;
    display: flex; gap: 20px; align-items: center;
  }
  .loyalty-pts { font-size: 32px; font-weight: 900; color: #7C3AED; }
  .loyalty-sub { font-size: 11px; color: #9898b0; }
  .loyalty-bar-bg { height: 8px; border-radius: 4px; background: #e8e8f0; margin: 8px 0 4px; overflow: hidden; }
  .loyalty-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg,#7C3AED,#9333EA); }

  /* ── Table ───────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead tr { background: linear-gradient(135deg,#5B21B6,#9333EA); }
  thead th {
    padding: 10px 14px; text-align: left;
    font-size: 10px; font-weight: 700; color: #fff;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  thead th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #f0f0f8; }
  tbody tr:nth-child(even) { background: #faf9ff; }
  tbody tr:last-child { border-bottom: none; }
  tbody td { padding: 10px 14px; font-size: 12px; color: #1a1a2e; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 700; color: #7C3AED; }
  .table-wrap { border: 1px solid #ebebf4; border-radius: 12px; overflow: hidden; }
  .status-pill {
    display: inline-block; padding: 2px 8px; border-radius: 20px;
    font-size: 10px; font-weight: 700;
  }
  .rank-num { font-size: 13px; font-weight: 800; color: #9898b0; }

  /* ── Notes ───────────────────────────────────────── */
  .notes-box {
    background: #faf9ff; border: 1px solid #e8e0ff;
    border-radius: 12px; padding: 14px 18px;
    font-size: 13px; color: #5a5a7a; line-height: 1.6; font-style: italic;
  }

  /* ── Footer ──────────────────────────────────────── */
  .footer {
    margin-top: 40px; padding-top: 16px;
    border-top: 1px solid #f0f0f8;
    display: flex; align-items: center; justify-content: space-between;
  }
  .footer-brand { display: flex; align-items: center; gap: 8px; }
  .footer-dot { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg,#5B21B6,#9333EA); }
  .footer-name { font-size: 12px; font-weight: 700; color: #5B21B6; }
  .footer-right { font-size: 11px; color: #b0b0c8; text-align: right; }

  /* ── Print ───────────────────────────────────────── */
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; max-width: 100%; }
    @page { margin: 0.5in; }
  }
`;

function openPrint(html: string, title: string) {
  const win = window.open("", "_blank", "width=960,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

const STATUS_COLORS: Record<string, [string, string]> = {
  completed:    ["#059669", "#ecfdf5"],
  "no-show":    ["#dc2626", "#fef2f2"],
  cancelled:    ["#6b7280", "#f9fafb"],
  booked:       ["#7C3AED", "#ede9fe"],
  confirmed:    ["#0284c7", "#e0f2fe"],
  arrived:      ["#9333EA", "#f5f3ff"],
  "in-progress":["#d97706", "#fffbeb"],
};

function statusPill(status: string) {
  const [color, bg] = STATUS_COLORS[status] ?? ["#6b7280", "#f9fafb"];
  return `<span class="status-pill" style="background:${bg};color:${color}">${status.replace("-", " ")}</span>`;
}

// ── CLIENT PDF ─────────────────────────────────────────────────────────────────

export function exportClientPdf(
  client: Client,
  appointments: Appointment[],
  loyaltySettings: LoyaltySettings,
  salonName: string,
) {
  const completed = appointments.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  const totalVisits = completed.length;
  const totalSpend  = completed.reduce((s, a) => s + a.totalAmount, 0);
  const avgTicket   = totalVisits ? Math.round(totalSpend / totalVisits) : 0;
  const lastVisit   = completed[0]?.date;

  const serviceFreq: Record<string, number> = {};
  completed.forEach((a) => a.serviceNames.forEach((s) => { serviceFreq[s] = (serviceFreq[s] ?? 0) + 1; }));
  const topServices = Object.entries(serviceFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const tier     = getTier(client.loyaltyPointsEarned ?? 0, loyaltySettings);
  const tierMeta = TIER_META[tier];
  const balance  = client.loyaltyPoints ?? 0;
  const earned   = client.loyaltyPointsEarned ?? 0;

  // Tier badge class
  const tierClass = tier === "gold" ? "badge-gold" : tier === "silver" ? "badge-silver" : tier === "platinum" ? "badge-platinum" : "";

  // Next tier progress
  let progressBar = "";
  if (tier !== "platinum" && earned > 0) {
    const next = tier === "none" || tier === "bronze" ? loyaltySettings.silverMin
               : tier === "silver" ? loyaltySettings.goldMin
               : loyaltySettings.platinumMin;
    const pct = Math.min(100, Math.round((earned / next) * 100));
    progressBar = `<div class="loyalty-bar-bg"><div class="loyalty-bar-fill" style="width:${pct}%"></div></div>
    <div style="font-size:10px;color:#9898b0">${(next - earned).toLocaleString()} pts to ${TIER_META[tier === "none" || tier === "bronze" ? "silver" : tier === "silver" ? "gold" : "platinum"].label}</div>`;
  }

  const visitRows = completed.slice(0, 20).map((a, i) => `
    <tr>
      <td style="color:#9898b0;font-weight:700">${i + 1}</td>
      <td>${fmtDate(a.date)}</td>
      <td>${a.serviceNames.join(", ")}</td>
      <td>${a.staffName || "—"}</td>
      <td>${fmtCur(a.totalAmount)}</td>
    </tr>`).join("");

  const svcRows = topServices.map(([name, count], i) => `
    <tr>
      <td><span class="rank-num">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span></td>
      <td>${name}</td>
      <td style="text-align:right;color:#1a1a2e">${count}×</td>
    </tr>`).join("");

  const tagsHtml = client.tags.map((t) => `<span class="badge" style="background:#EDE9FE;color:#7C3AED;border-color:#DDD6FE">${t}</span>`).join(" ");

  const html = `
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="avatar">${client.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="header-name">${client.name}</div>
          <div class="header-badges">
            ${tagsHtml}
            <span class="badge ${tierClass}">${tierMeta.emoji} ${tierMeta.label}</span>
          </div>
          <div class="header-meta">
            📞 ${client.phone}${client.email ? ` &nbsp;·&nbsp; ✉️ ${client.email}` : ""}
            ${client.dob ? `<br>🎂 Date of Birth: ${fmtDate(client.dob)}` : ""}
            <br>📅 Member since ${fmtDate(client.createdAt)} &nbsp;·&nbsp; Source: ${client.source}
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="salon-name">${salonName}</div>
        <div class="report-type">Client Profile</div>
        <div class="report-date">Generated: ${fmtDateLong()}</div>
      </div>
    </div>

    <div class="body">

      <!-- SUMMARY STATS -->
      <div class="section-title">Summary</div>
      <div class="stat-grid">
        <div class="stat-card" style="--accent:#7C3AED">
          <div class="stat-val">${totalVisits}</div>
          <div class="stat-lbl">Total Visits</div>
        </div>
        <div class="stat-card" style="--accent:#059669">
          <div class="stat-val">${fmtCur(totalSpend)}</div>
          <div class="stat-lbl">Total Spend</div>
        </div>
        <div class="stat-card" style="--accent:#0284c7">
          <div class="stat-val">${avgTicket ? fmtCur(avgTicket) : "—"}</div>
          <div class="stat-lbl">Avg Ticket</div>
        </div>
        <div class="stat-card" style="--accent:#d97706">
          <div class="stat-val" style="font-size:16px">${fmtDate(lastVisit)}</div>
          <div class="stat-lbl">Last Visit</div>
        </div>
        <div class="stat-card" style="--accent:#db2777">
          <div class="stat-val">${balance.toLocaleString()} pts</div>
          <div class="stat-lbl">Loyalty Balance</div>
          <div class="stat-sub">≈ ${fmtCur(pointsToRupees(balance, loyaltySettings.rupeePerPoint))} value</div>
        </div>
        <div class="stat-card" style="--accent:#6b21a8">
          <div class="stat-val" style="font-size:18px">${tierMeta.emoji} ${tierMeta.label}</div>
          <div class="stat-lbl">Loyalty Tier</div>
          <div class="stat-sub">${earned.toLocaleString()} pts earned lifetime</div>
        </div>
      </div>

      <!-- LOYALTY PROGRESS -->
      ${progressBar ? `
      <div class="section-title">Loyalty Progress</div>
      <div style="background:#f7f7fb;border:1px solid #ebebf4;border-radius:12px;padding:16px 20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:700;color:#1a1a2e">${tierMeta.emoji} ${tierMeta.label}</span>
          <span style="font-size:12px;color:#9898b0">${earned.toLocaleString()} pts earned</span>
        </div>
        ${progressBar}
      </div>` : ""}

      <!-- CONTACT & INFO -->
      <div class="section-title">Contact &amp; Info</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${client.phone}</div></div>
        <div class="info-item"><div class="info-label">Email</div><div class="info-value">${client.email || "—"}</div></div>
        <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${client.dob ? fmtDate(client.dob) : "—"}</div></div>
        <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${client.gender || "—"}</div></div>
        <div class="info-item"><div class="info-label">Source</div><div class="info-value">${client.source}</div></div>
        <div class="info-item"><div class="info-label">Member Since</div><div class="info-value">${fmtDate(client.createdAt)}</div></div>
      </div>

      <!-- FAVOURITE SERVICES -->
      ${topServices.length > 0 ? `
      <div class="section-title">Favourite Services</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th width="50">#</th><th>Service</th><th style="text-align:right">Visits</th></tr></thead>
          <tbody>${svcRows}</tbody>
        </table>
      </div>` : ""}

      <!-- VISIT HISTORY -->
      <div class="section-title">Visit History${completed.length > 20 ? " (last 20)" : ""}</div>
      ${completed.length === 0
        ? `<div style="background:#f7f7fb;border-radius:12px;padding:20px;text-align:center;color:#9898b0;font-size:13px">No completed visits on record.</div>`
        : `<div class="table-wrap"><table>
            <thead><tr><th width="36">#</th><th>Date</th><th>Services</th><th>Staff</th><th>Amount</th></tr></thead>
            <tbody>${visitRows}</tbody>
          </table></div>`}

      <!-- NOTES -->
      ${client.notes ? `
      <div class="section-title">Notes &amp; Preferences</div>
      <div class="notes-box">${client.notes}</div>` : ""}

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">
          <div class="footer-dot"></div>
          <div class="footer-name">${salonName}</div>
        </div>
        <div class="footer-right">
          Client Profile &nbsp;·&nbsp; ${fmtDateLong()}<br>
          <span style="color:#d0d0d8">Powered by Werzio</span>
        </div>
      </div>

    </div>
  </div>`;

  openPrint(html, `${client.name} — Client Profile`);
}

// ── STAFF PDF ──────────────────────────────────────────────────────────────────

export function exportStaffPdf(
  staff: Staff,
  appointments: Appointment[],
  salonName: string,
) {
  const allMine   = appointments.filter((a) => a.staffId === staff.id);
  const completed = allMine.filter((a) => a.status === "completed");
  const noShow    = allMine.filter((a) => a.status === "no-show");

  const totalRev   = completed.reduce((s, a) => s + (a.totalAmount ?? 0), 0);
  const avgTicket  = completed.length ? Math.round(totalRev / completed.length) : 0;
  const noShowRate = allMine.length ? Math.round((noShow.length / allMine.length) * 100) : 0;
  const uniqueClients = new Set(allMine.map((a) => a.clientId)).size;

  const serviceCount: Record<string, number>  = {};
  const serviceRevenue: Record<string, number> = {};
  for (const appt of completed) {
    for (const name of appt.serviceNames) {
      serviceCount[name]   = (serviceCount[name]   ?? 0) + 1;
      serviceRevenue[name] = (serviceRevenue[name] ?? 0) + (appt.totalAmount ?? 0) / appt.serviceNames.length;
    }
  }
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count, revenue: Math.round(serviceRevenue[name] ?? 0) }));

  const recentAppts = [...allMine].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  const ROLE_COLORS: Record<string, string> = {
    owner: "#7C3AED", manager: "#0369a1", "senior-stylist": "#059669",
    "junior-stylist": "#d97706", receptionist: "#db2777", trainee: "#6b7280",
  };
  const roleColor = ROLE_COLORS[staff.role] ?? "#7C3AED";

  const specialtiesHtml = (staff.specialties ?? [])
    .map((s) => `<span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">${s}</span>`)
    .join(" ");

  const svcRows = topServices.map((s, i) => `
    <tr>
      <td><span class="rank-num">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span></td>
      <td>${s.name}</td>
      <td style="text-align:center;color:#1a1a2e">${s.count}×</td>
      <td>${fmtCur(s.revenue)}</td>
    </tr>`).join("");

  const apptRows = recentAppts.map((a) => `
    <tr>
      <td>${fmtDate(a.date)}</td>
      <td>${a.clientName}</td>
      <td>${a.serviceNames.join(", ")}</td>
      <td>${statusPill(a.status)}</td>
      <td>${a.status === "completed" ? fmtCur(a.totalAmount ?? 0) : "—"}</td>
    </tr>`).join("");

  const html = `
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="avatar">${staff.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="header-name">${staff.name}</div>
          <div class="header-badges">
            <span class="badge" style="background:rgba(255,255,255,0.25);color:#fff;border-color:rgba(255,255,255,0.4)">
              ${staff.role.replace(/-/g, " ")}
            </span>
            <span class="badge ${staff.isActive ? "badge-active" : "badge-inactive"}">${staff.isActive ? "● Active" : "● Inactive"}</span>
          </div>
          <div class="header-meta">
            📞 ${staff.phone}
            ${specialtiesHtml ? `<br><span style="font-size:11px">Services: </span>${specialtiesHtml}` : ""}
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="salon-name">${salonName}</div>
        <div class="report-type">Staff Profile</div>
        <div class="report-date">Generated: ${fmtDateLong()}</div>
      </div>
    </div>

    <div class="body">

      <!-- PERFORMANCE STATS -->
      <div class="section-title">Performance Summary</div>
      <div class="stat-grid">
        <div class="stat-card" style="--accent:#7C3AED">
          <div class="stat-val">${fmtCur(totalRev)}</div>
          <div class="stat-lbl">Total Revenue</div>
          <div class="stat-sub">from completed appointments</div>
        </div>
        <div class="stat-card" style="--accent:#059669">
          <div class="stat-val">${completed.length}</div>
          <div class="stat-lbl">Services Completed</div>
        </div>
        <div class="stat-card" style="--accent:#0284c7">
          <div class="stat-val">${allMine.length}</div>
          <div class="stat-lbl">Total Appointments</div>
        </div>
        <div class="stat-card" style="--accent:#d97706">
          <div class="stat-val">${avgTicket ? fmtCur(avgTicket) : "—"}</div>
          <div class="stat-lbl">Avg Ticket</div>
          <div class="stat-sub">per completed service</div>
        </div>
        <div class="stat-card" style="--accent:#db2777">
          <div class="stat-val">${uniqueClients}</div>
          <div class="stat-lbl">Unique Clients</div>
          <div class="stat-sub">total clients served</div>
        </div>
        <div class="stat-card" style="--accent:${noShowRate > 20 ? "#dc2626" : "#9ca3af"}">
          <div class="stat-val" style="color:${noShowRate > 20 ? "#dc2626" : "#6b7280"}">${noShowRate}%</div>
          <div class="stat-lbl">No-show Rate</div>
          <div class="stat-sub">${noShow.length} no-shows total</div>
        </div>
      </div>

      <!-- STAFF INFO -->
      <div class="section-title">Staff Details</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${staff.phone}</div></div>
        <div class="info-item">
          <div class="info-label">Role</div>
          <div class="info-value">
            <span style="color:${roleColor};font-weight:700">${staff.role.replace(/-/g, " ")}</span>
          </div>
        </div>
        <div class="info-item"><div class="info-label">Status</div><div class="info-value" style="color:${staff.isActive ? "#059669" : "#dc2626"}">${staff.isActive ? "Active" : "Inactive"}</div></div>
        <div class="info-item"><div class="info-label">Specialties</div><div class="info-value">${(staff.specialties ?? []).join(", ") || "—"}</div></div>
      </div>

      <!-- TOP SERVICES -->
      ${topServices.length > 0 ? `
      <div class="section-title">Top Services</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th width="50">#</th><th>Service</th><th style="text-align:center">Count</th><th>Revenue</th></tr></thead>
          <tbody>${svcRows}</tbody>
        </table>
      </div>` : ""}

      <!-- RECENT APPOINTMENTS -->
      <div class="section-title">Recent Appointments${allMine.length > 15 ? " (last 15)" : ""}</div>
      ${recentAppts.length === 0
        ? `<div style="background:#f7f7fb;border-radius:12px;padding:20px;text-align:center;color:#9898b0;font-size:13px">No appointments on record.</div>`
        : `<div class="table-wrap"><table>
            <thead><tr><th>Date</th><th>Client</th><th>Services</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>${apptRows}</tbody>
          </table></div>`}

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">
          <div class="footer-dot"></div>
          <div class="footer-name">${salonName}</div>
        </div>
        <div class="footer-right">
          Staff Profile &nbsp;·&nbsp; ${fmtDateLong()}<br>
          <span style="color:#d0d0d8">Powered by Werzio</span>
        </div>
      </div>

    </div>
  </div>`;

  openPrint(html, `${staff.name} — Staff Profile`);
}

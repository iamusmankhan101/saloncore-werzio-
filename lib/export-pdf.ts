import type { Client, Appointment, Staff } from "./types";
import { getTier, TIER_META, pointsToRupees, type LoyaltySettings } from "./loyalty";

function fmtCur(n: number) {
  return "Rs. " + n.toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const BASE_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 32px; }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  h2 { font-size: 13px; font-weight: 700; color: #5a5a7a; margin: 22px 0 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .meta { font-size: 12px; color: #6b6b8a; margin-bottom: 2px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 4px; }
  .stat-box { background: #f7f7fb; border-radius: 10px; padding: 12px 14px; }
  .stat-val { font-size: 20px; font-weight: 900; color: #7C3AED; }
  .stat-lbl { font-size: 10px; color: #9898b0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f7f7fb; color: #9898b0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; text-align: left; font-size: 10px; }
  td { padding: 9px 10px; border-bottom: 1px solid #f0f0f8; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .header { display: flex; align-items: flex-start; gap: 18px; margin-bottom: 18px; }
  .avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg,#5B21B6,#9333EA); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .divider { border: none; border-top: 1px solid #e8e8f0; margin: 16px 0; }
  .tag { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-right: 4px; }
  footer { margin-top: 28px; font-size: 10px; color: #b0b0c8; border-top: 1px solid #f0f0f8; padding-top: 10px; }
  @media print { body { padding: 20px; } }
`;

function openPrint(html: string, title: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${BASE_STYLE}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ── Client PDF ─────────────────────────────────────────────────────────────────

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

  const tier    = getTier(client.loyaltyPointsEarned ?? 0, loyaltySettings);
  const tierMeta = TIER_META[tier];
  const balance  = client.loyaltyPoints ?? 0;

  const tagsHtml = client.tags.map((t) => `<span class="tag" style="background:#EDE9FE;color:#7C3AED">${t}</span>`).join("");

  const visitRows = completed.slice(0, 20).map((a) => `
    <tr>
      <td>${fmtDate(a.date)}</td>
      <td>${a.serviceNames.join(", ")}</td>
      <td>${a.staffName || "—"}</td>
      <td style="text-align:right;font-weight:700;color:#7C3AED">${fmtCur(a.totalAmount)}</td>
    </tr>
  `).join("");

  const svcRows = topServices.map(([name, count], i) => `
    <tr>
      <td style="color:#9898b0;font-weight:700">${i + 1}</td>
      <td>${name}</td>
      <td style="text-align:center">${count}×</td>
    </tr>
  `).join("");

  const html = `
    <div class="header">
      <div class="avatar">${client.name.charAt(0)}</div>
      <div>
        <h1>${client.name}</h1>
        <div style="margin:6px 0">${tagsHtml}</div>
        <div class="meta">📞 ${client.phone}${client.email ? ` &nbsp;·&nbsp; ✉️ ${client.email}` : ""}</div>
        ${client.dob ? `<div class="meta">🎂 DOB: ${fmtDate(client.dob)}</div>` : ""}
        <div class="meta">📅 Member since ${fmtDate(client.createdAt)} &nbsp;·&nbsp; Source: ${client.source}</div>
      </div>
    </div>

    <h2>Summary</h2>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val">${totalVisits}</div><div class="stat-lbl">Total Visits</div></div>
      <div class="stat-box"><div class="stat-val">${fmtCur(totalSpend)}</div><div class="stat-lbl">Total Spend</div></div>
      <div class="stat-box"><div class="stat-val">${avgTicket ? fmtCur(avgTicket) : "—"}</div><div class="stat-lbl">Avg Ticket</div></div>
      <div class="stat-box"><div class="stat-val">${fmtDate(lastVisit)}</div><div class="stat-lbl">Last Visit</div></div>
      <div class="stat-box"><div class="stat-val" style="color:#db2777">${balance} pts</div><div class="stat-lbl">Loyalty Balance</div></div>
      <div class="stat-box">
        <div class="stat-val" style="font-size:14px">${tierMeta.emoji} ${tierMeta.label}</div>
        <div class="stat-lbl">Loyalty Tier &nbsp;·&nbsp; ${fmtCur(pointsToRupees(balance, loyaltySettings.rupeePerPoint))} value</div>
      </div>
    </div>

    ${topServices.length > 0 ? `
    <h2>Favourite Services</h2>
    <table>
      <thead><tr><th>#</th><th>Service</th><th style="text-align:center">Visits</th></tr></thead>
      <tbody>${svcRows}</tbody>
    </table>` : ""}

    <h2>Visit History ${completed.length > 20 ? "(last 20)" : ""}</h2>
    ${completed.length === 0
      ? `<p style="color:#9898b0;font-size:12px">No completed visits yet.</p>`
      : `<table>
          <thead><tr><th>Date</th><th>Services</th><th>Staff</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${visitRows}</tbody>
        </table>`}

    ${client.notes ? `<h2>Notes</h2><p style="background:#f7f7fb;border-radius:8px;padding:10px 12px;font-style:italic;color:#5a5a7a">${client.notes}</p>` : ""}

    <footer>Generated by ${salonName} &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</footer>
  `;

  openPrint(html, `${client.name} — Client Profile`);
}

// ── Staff PDF ──────────────────────────────────────────────────────────────────

export function exportStaffPdf(
  staff: Staff,
  appointments: Appointment[],
  salonName: string,
) {
  const completed = appointments.filter((a) => a.staffId === staff.id && a.status === "completed");
  const noShow    = appointments.filter((a) => a.staffId === staff.id && a.status === "no-show");
  const allMine   = appointments.filter((a) => a.staffId === staff.id);

  const totalRev    = completed.reduce((s, a) => s + (a.totalAmount ?? 0), 0);
  const avgTicket   = completed.length ? Math.round(totalRev / completed.length) : 0;
  const noShowRate  = allMine.length ? Math.round((noShow.length / allMine.length) * 100) : 0;
  const uniqueClients = new Set(allMine.map((a) => a.clientId)).size;

  const serviceCount: Record<string, number> = {};
  const serviceRevenue: Record<string, number> = {};
  for (const appt of completed) {
    for (const name of appt.serviceNames) {
      serviceCount[name]   = (serviceCount[name] ?? 0) + 1;
      serviceRevenue[name] = (serviceRevenue[name] ?? 0) + (appt.totalAmount ?? 0) / appt.serviceNames.length;
    }
  }
  const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count, revenue: Math.round(serviceRevenue[name] ?? 0) }));

  const recentAppts = [...allMine].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  const roleColors: Record<string, string> = {
    owner: "#7C3AED", manager: "#0369a1", "senior-stylist": "#059669",
    "junior-stylist": "#d97706", receptionist: "#db2777", trainee: "#6b7280",
  };
  const roleColor = roleColors[staff.role] ?? "#7C3AED";

  const statusColor: Record<string, string> = {
    completed: "#059669", "no-show": "#dc2626", cancelled: "#9ca3af",
    booked: "#7C3AED", confirmed: "#0284c7", arrived: "#9333EA", "in-progress": "#d97706",
  };

  const svcRows = topServices.map((s, i) => `
    <tr>
      <td style="color:#9898b0;font-weight:700">${i + 1}</td>
      <td>${s.name}</td>
      <td style="text-align:center">${s.count}×</td>
      <td style="text-align:right;font-weight:700;color:#7C3AED">${fmtCur(s.revenue)}</td>
    </tr>
  `).join("");

  const apptRows = recentAppts.map((a) => `
    <tr>
      <td>${fmtDate(a.date)}</td>
      <td>${a.clientName}</td>
      <td>${a.serviceNames.join(", ")}</td>
      <td><span style="color:${statusColor[a.status] ?? "#6b7280"};font-weight:700">${a.status}</span></td>
      <td style="text-align:right;font-weight:700;color:#7C3AED">${a.status === "completed" ? fmtCur(a.totalAmount ?? 0) : "—"}</td>
    </tr>
  `).join("");

  const specialtiesHtml = (staff.specialties ?? []).map((s) => `<span class="tag" style="background:#EDE9FE;color:#7C3AED">${s}</span>`).join("");

  const html = `
    <div class="header">
      <div class="avatar">${staff.name.charAt(0)}</div>
      <div>
        <h1>${staff.name}</h1>
        <div style="margin:6px 0">
          <span class="badge" style="background:${roleColor}18;color:${roleColor}">${staff.role.replace(/-/g, " ")}</span>
          &nbsp;
          <span class="badge" style="background:${staff.isActive ? "#ecfdf5" : "#f9fafb"};color:${staff.isActive ? "#059669" : "#6b7280"}">${staff.isActive ? "Active" : "Inactive"}</span>
        </div>
        <div class="meta">📞 ${staff.phone}</div>
        ${specialtiesHtml ? `<div style="margin-top:6px">${specialtiesHtml}</div>` : ""}
      </div>
    </div>

    <h2>Performance Summary</h2>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val">${fmtCur(totalRev)}</div><div class="stat-lbl">Total Revenue</div></div>
      <div class="stat-box"><div class="stat-val">${completed.length}</div><div class="stat-lbl">Services Done</div></div>
      <div class="stat-box"><div class="stat-val">${allMine.length}</div><div class="stat-lbl">Total Appointments</div></div>
      <div class="stat-box"><div class="stat-val">${avgTicket ? fmtCur(avgTicket) : "—"}</div><div class="stat-lbl">Avg Ticket</div></div>
      <div class="stat-box"><div class="stat-val">${uniqueClients}</div><div class="stat-lbl">Unique Clients</div></div>
      <div class="stat-box"><div class="stat-val" style="color:${noShowRate > 15 ? "#dc2626" : "#059669"}">${noShowRate}%</div><div class="stat-lbl">No-show Rate</div></div>
    </div>

    ${topServices.length > 0 ? `
    <h2>Top Services</h2>
    <table>
      <thead><tr><th>#</th><th>Service</th><th style="text-align:center">Count</th><th style="text-align:right">Revenue</th></tr></thead>
      <tbody>${svcRows}</tbody>
    </table>` : ""}

    <h2>Recent Appointments ${allMine.length > 15 ? "(last 15)" : ""}</h2>
    ${recentAppts.length === 0
      ? `<p style="color:#9898b0;font-size:12px">No appointments yet.</p>`
      : `<table>
          <thead><tr><th>Date</th><th>Client</th><th>Services</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${apptRows}</tbody>
        </table>`}

    <footer>Generated by ${salonName} &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</footer>
  `;

  openPrint(html, `${staff.name} — Staff Profile`);
}

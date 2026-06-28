import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  // ── Content-Security-Policy ───────────────────────────────────────────────
  // Restricts where scripts/styles/connections can come from.
  // 'unsafe-inline' on scripts is required by Next.js inline hydration scripts;
  // remove it only if you introduce nonce-based CSP.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.turso.io wss://*.turso.io https://api.resend.com https://graph.facebook.com https://api.qrserver.com https://api.wasenderapi.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      isProd ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join("; "),
  },

  // ── HTTPS enforcement (HSTS) ──────────────────────────────────────────────
  // Tells browsers to always use HTTPS for 1 year. Only effective in production.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),

  // ── Prevent MIME sniffing ─────────────────────────────────────────────────
  { key: "X-Content-Type-Options", value: "nosniff" },

  // ── Block clickjacking ────────────────────────────────────────────────────
  { key: "X-Frame-Options", value: "DENY" },

  // ── Limit referrer information ────────────────────────────────────────────
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // ── Disable browser features the app doesn't use ─────────────────────────
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },

  // ── Prevent cross-site scripting via DNS prefetch ─────────────────────────
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

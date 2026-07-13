"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Gift, Award, Sparkles, Smartphone, CheckCircle2,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoModal from "./DemoModal";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── hero loyalty card ──────────────────────────────────── */
function HeroLoyalty() {
  return (
    <div className={styles.heroCard} aria-label="Salon Central loyalty program preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Loyalty</span>
          <strong>Gold Member</strong>
        </div>
        <button type="button">Redeem</button>
      </div>
      <div style={{ padding: 16, borderRadius: 16, background: "linear-gradient(135deg, #1e1b4b, #6d28d9 60%, #9333ea)", color: "#fff", marginBottom: 10 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", opacity: .8, marginBottom: 8 }}>POINTS BALANCE</div>
        <div style={{ fontSize: "1.7rem", fontWeight: 900 }}>2,480</div>
        <div style={{ fontSize: "0.68rem", opacity: .75, marginTop: 2 }}>≈ PKR 2,480 redeemable</div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.2)", marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "76%", background: "#fcd34d", borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: "0.6rem", opacity: .7, marginTop: 4 }}>520 points to Platinum</div>
      </div>
      <div className={styles.floatingNote} style={{ right: -20, top: 180 }}>
        <Sparkles size={14} />
        <span>Auto-earned at every POS sale</span>
      </div>
    </div>
  );
}

/* ─── feature visuals ────────────────────────────────────── */
function TiersPanel() {
  const tiers = [
    { tier: "Bronze",   c: "#78350f", bg: "#fef9c3", min: "0 pts" },
    { tier: "Silver",   c: "#374151", bg: "#f1f5f9", min: "2,000 pts" },
    { tier: "Gold",     c: "#92400e", bg: "#fef3c7", min: "5,000 pts" },
    { tier: "Platinum", c: "#6b21a8", bg: "#f3e8ff", min: "10,000 pts" },
  ];
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 14 }}>
        <Award size={16} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>4 membership tiers</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tiers.map((t) => (
          <div key={t.tier} style={{ padding: "10px 12px", borderRadius: 10, background: t.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 900, color: t.c }}>{t.tier}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: t.c, opacity: .8 }}>{t.min}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PointsEarnPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar} style={{ background: "#9333ea22", color: "#9333ea", fontSize: "0.85rem" }}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.95rem" }}>Sana Nawaz</strong>
          <span>Gold Member</span>
        </div>
      </div>
      {[
        { label: "Sale Total",          value: "PKR 5,300" },
        { label: "Points Earned",       value: "+53 pts", purple: true },
        { label: "New Balance",         value: "2,480 pts" },
        { label: "Redeemable Value",    value: "≈ PKR 2,480" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: (row as { purple?: boolean }).purple ? "#9333ea" : "#17112a" }}>{row.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function RedeemPanel() {
  const rows = [
    { label: "Available Points", value: "2,480 pts" },
    { label: "Redeem",           value: "1,000 pts", sub: "= PKR 1,000 off" },
    { label: "Remaining After",  value: "1,480 pts" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 14 }}>Redeem at checkout</div>
      {rows.map((r) => (
        <div key={r.label} className={styles.staffRow}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{r.label}</strong>
            {r.sub && <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{r.sub}</div>}
          </div>
          <em style={{ color: "#9333ea", fontStyle: "normal", fontWeight: 900, fontSize: "0.75rem" }}>{r.value}</em>
        </div>
      ))}
    </div>
  );
}

function WalletCardPanel() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 14 }}>
        <Smartphone size={16} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>Digital loyalty card</span>
      </div>
      <div style={{ padding: 16, borderRadius: 16, background: "linear-gradient(135deg, #1e1b4b, #6d28d9 60%, #9333ea)", color: "#fff" }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", opacity: .8, marginBottom: 10 }}>SALON CENTRAL LOYALTY</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>2,480 pts</div>
        <div style={{ fontSize: "0.68rem", opacity: .75, marginTop: 2 }}>Sana Nawaz · Gold Member</div>
      </div>
      <div className={styles.blockArea} style={{ marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "0.74rem", fontWeight: 800, color: "#166534" }}>
          ✓ Adds to Apple &amp; Google Wallet: no app download needed
        </div>
      </div>
    </div>
  );
}

/* ─── feature rows ───────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Automatic points",
    title: "Loyalty points program that rewards every salon sale",
    body: "Points are calculated and credited the moment a sale completes at POS or an appointment is marked paid. Set your own points-per-rupee rate once and every client's balance updates itself from then on.",
    visual: <PointsEarnPanel />,
  },
  {
    eyebrow: "4 membership tiers",
    title: "Salon customer loyalty program with membership tiers",
    body: "Clients climb tiers automatically as their lifetime points grow. Each tier gets a colour-coded badge on their profile, so your front desk can recognise your best clients at a glance.",
    visual: <TiersPanel />,
  },
  {
    eyebrow: "Redeemable discounts",
    title: "Loyalty points calculator for checkout discounts",
    body: "At POS, apply any amount of a client's available points as a discount on their current sale. The redeemable value and remaining balance are shown live before you confirm the payment.",
    visual: <RedeemPanel />,
  },
  {
    eyebrow: "Digital & Google Wallet cards",
    title: "Digital salon loyalty cards clients keep on their phone",
    body: "Every client gets a digital loyalty card showing their tier and points balance, with one-tap add to Apple and Google Wallet: no separate app to install, no plastic cards to print.",
    visual: <WalletCardPanel />,
  },
];

/* ─── page ───────────────────────────────────────────────── */
export default function LoyaltyFeaturePage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <Gift size={16} />
                Loyalty points program
              </div>
              <h1>Loyalty points program for salons</h1>
              <p>
                Salon Central awards points automatically on every sale, works as a loyalty points calculator at checkout, ranks clients through Bronze-to-Platinum tiers, and lets them redeem points for discounts with a digital card they can add straight to their phone&apos;s wallet.
              </p>
              <div className={styles.heroActions}>
                <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </button>
                <Link href="/#pricing" className={styles.secondaryCta}>View pricing</Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/salon-central-logo.png" alt="Salon Central logo" width={96} height={96} />
                <span>Salon Central Loyalty</span>
              </div>
              <HeroLoyalty />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        <section className={styles.featureStack}>
          {rows.map((row, i) => (
            <article key={row.title} className={`${styles.featureRow} ${i % 2 ? styles.flip : ""}`}>
              <div className={styles.rowCopy}>
                <span>{row.eyebrow}</span>
                <h2>{row.title}</h2>
                <p>{row.body}</p>
              </div>
              <div className={styles.rowVisual}>{row.visual}</div>
            </article>
          ))}
        </section>

        <section className={styles.ctaBand}>
          <div>
            <span>Points, tiers, wallet cards, and POS reward tracking</span>
            <h2>Launch a salon rewards program clients remember</h2>
          </div>
          <div className={styles.ctaActions}>
            <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </button>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        <section className={styles.miniStats} aria-label="Loyalty program advantages">
          <div>
            <Sparkles size={19} />
            <strong>POS reward points</strong>
            <span>Points are credited the moment a sale or appointment is marked paid.</span>
          </div>
          <div>
            <Award size={19} />
            <strong>4 tiers</strong>
            <span>Bronze, Silver, Gold, and Platinum with thresholds you control.</span>
          </div>
          <div>
            <CheckCircle2 size={19} />
            <strong>Points calculator</strong>
            <span>Apply points as a discount directly at checkout.</span>
          </div>
          <div>
            <Smartphone size={19} />
            <strong>Google Wallet</strong>
            <span>A digital card clients add to their phone in one tap.</span>
          </div>
        </section>
      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

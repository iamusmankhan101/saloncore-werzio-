"use client";

export default function SalonCentralWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label="Salon Central"
      style={{
        position: "relative",
        overflow: "hidden",
        width: compact ? 104 : 184,
        height: compact ? 51 : 90,
        flexShrink: 0,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <img
        src="/salon-central-logo.png"
        alt=""
        style={{
          position: "absolute",
          width: "117.52%",
          height: "241.61%",
          maxWidth: "none",
          left: "-9.14%",
          top: "-66%",
        }}
      />
    </div>
  );
}

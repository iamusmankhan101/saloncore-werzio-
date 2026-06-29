import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const rawName = req.nextUrl.searchParams.get("name")?.trim() || "Salon";
  const salonName = rawName.slice(0, 40);
  const fontSize = salonName.length > 28 ? 56 : salonName.length > 18 ? 72 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          padding: "0 60px",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 800,
            color: "#1a1a2e",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          {salonName}
        </span>
      </div>
    ),
    {
      width: 1032,
      height: 336,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

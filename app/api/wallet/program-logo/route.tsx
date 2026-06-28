import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const rawName = req.nextUrl.searchParams.get("name")?.trim() || "Salon";
  const salonName = rawName.slice(0, 40);
  const fontSize = salonName.length > 24 ? 42 : salonName.length > 15 ? 52 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 36,
          background: "#ffffff",
          color: "#5B21B6",
          fontSize,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        {salonName}
      </div>
    ),
    {
      width: 500,
      height: 500,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

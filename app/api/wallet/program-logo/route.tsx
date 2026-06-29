import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
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
        }}
      >
        <span
          style={{
            fontSize: 320,
            fontWeight: 900,
            color: "#111111",
            lineHeight: 1,
            letterSpacing: "-0.06em",
            fontFamily: "sans-serif",
          }}
        >
          W
        </span>
      </div>
    ),
    {
      width: 500,
      height: 500,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}

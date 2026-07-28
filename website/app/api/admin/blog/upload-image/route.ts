import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireBlogSession } from "@/lib/blog-auth";

const UPLOAD_FOLDER = "salon-central-blog";

// Returns a signed-upload payload so the browser can POST the image file
// directly to Cloudinary — the API secret is only ever used here, server-side,
// to produce the signature, and never reaches the client.
export async function POST(req: NextRequest) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ ok: false, error: "Cloudinary is not configured on this deployment." }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER },
    apiSecret,
  );

  return NextResponse.json({
    ok: true,
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder: UPLOAD_FOLDER,
  });
}

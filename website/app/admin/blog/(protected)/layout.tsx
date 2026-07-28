import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BLOG_SESSION_COOKIE, verifySessionToken } from "@/lib/blog-auth";

export default async function ProtectedBlogAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(BLOG_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    redirect("/admin/blog/login");
  }
  return <>{children}</>;
}

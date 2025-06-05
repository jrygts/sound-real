import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  /* ----------------------------------------------------------
   * Exchange the `?code` query param for a session cookie once.
   * This sets `sb-access-token` + `sb-refresh-token` cookies on
   * the response and populates `session`.
   * --------------------------------------------------------- */
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("📥 [post-login] No code parameter found");
    redirect("/");
  }

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("📥 [post-login] exchange error", exchangeError);
    redirect("/"); // fallback
  }

  const session = exchangeData.session;

  console.log("📥 [post-login] Authentication successful");

  if (!session) {
    console.log("📥 [post-login] No session → redirect /");
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("has_access")
    .eq("id", session.user.id)
    .single();

  console.log("📥 [post-login] profile row", { profile, profileError });

  const dest = profile?.has_access
    ? "/dashboard/humanize"
    : "/pricing";

  console.log("📥 [post-login] redirecting to", dest);
  redirect(dest);
} 
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access")
    .eq("id", session.user.id)
    .single();

  if (profile?.has_access) {
    redirect("/dashboard/humanize");
  } else {
    redirect("/pricing");
  }
} 
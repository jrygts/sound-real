import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import LandingPageContent from "@/components/LandingPageContent";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) redirect("/dashboard");

  return <LandingPageContent />;
}

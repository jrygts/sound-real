import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import MarketingLayout from "@/app/(marketing)/layout";
import AuthComponent from "@/components/AuthComponent";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/auth/post-login");

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-md py-24">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to Home
        </Link>
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Sign in to SoundReal</h1>
          <p className="text-muted-foreground mt-2">Access your dashboard and manage your account</p>
        </div>
        <AuthComponent />
      </div>
    </MarketingLayout>
  );
} 
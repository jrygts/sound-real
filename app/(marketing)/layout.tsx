import { createClient } from "@/libs/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default async function MarketingLayout({ children }: Props) {
  const supabase = createClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log(
      "🍪 [marketing] host",
      headers().get("host"),
      "session:",
      !!session,
      "cookie:",
      cookies().getAll().find((c) => c.name === "sb-access-token")
    );

    // Check if user is authenticated and coming from /auth route
    if (session?.user) {
      const cookieStore = cookies();
      const routeCookie = cookieStore.get("route");
      
      if (routeCookie?.value === "/auth") {
        redirect("/dashboard");
      }
    }
  } catch (error) {
    console.error("Auth check error in marketing layout:", error);
    // Continue rendering if auth check fails
  }

  return <>{children}</>;
} 
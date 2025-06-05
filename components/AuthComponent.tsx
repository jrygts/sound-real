"use client";

import { createClient } from "@/libs/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function AuthComponent() {
  const supabase = createClient();

  // Create absolute URL for redirectTo (Supabase requires absolute URLs)
  // Must match EXACTLY with Supabase → Auth → Settings → Site URL
  const SITE =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");   // dev fallback

  const redirectUrl = `${SITE}/auth/post-login`;

  return (
    <Auth
      supabaseClient={supabase}
      magicLink
      providers={["google"]}
      redirectTo={redirectUrl}
      appearance={{
        theme: ThemeSupa,
        variables: { default: { colors: { brand: "#635BFF" } } },
      }}
      localization={{
        variables: {
          sign_in: { email_label: "Email address", button_label: "Log in" },
          sign_up: { email_label: "Email address", button_label: "Create account" },
        },
      }}
    />
  );
} 
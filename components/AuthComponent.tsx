"use client";

import { createClient } from "@/libs/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function AuthComponent() {
  const supabase = createClient();

  return (
    <Auth
      supabaseClient={supabase}
      magicLink
      providers={["google"]}
      redirectTo="/dashboard"
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
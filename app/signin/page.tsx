"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { Provider } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import config from "@/config";

// This a login/singup page for Supabase Auth.
// Successfull login redirects to /api/auth/callback where the Code Exchange is processed (see app/api/auth/callback/route.js).
export default function Login() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const handleSignup = async (
    e: any,
    options: {
      type: string;
      provider?: Provider;
    }
  ) => {
    e?.preventDefault();

    setIsLoading(true);

    try {
      const { type, provider } = options;
      const redirectURL = window.location.origin + "/api/auth/callback";

      if (type === "oauth") {
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectURL,
          },
        });
      } else if (type === "magic_link") {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
          },
        });

        toast.success("Check your emails!");

        setIsDisabled(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 md:p-24" data-theme={config.colors.theme}>
      <div className="text-center mb-4">
        <Link href="/" className="btn btn-ghost btn-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Home
        </Link>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Sign-in to {config.appName}
        </h1>
        <p className="text-lg text-base-content/70">
          Join thousands of users transforming AI text into human-sounding content
        </p>
      </div>

      <div className="space-y-6 max-w-xl mx-auto">
        {/* Primary Google Sign-in - Most Prominent */}
        <div className="text-center">
          <button
            className="btn btn-primary btn-block btn-lg gap-3 text-base"
            onClick={(e) =>
              handleSignup(e, { type: "oauth", provider: "google" })
            }
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                viewBox="0 0 48 48"
              >
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
            )}
            Continue with Google
          </button>
          <p className="text-sm text-base-content/50 mt-2">
            🚀 Fastest way to get started • No password needed
          </p>
        </div>

        <div className="divider text-xs text-base-content/50 font-medium">
          OR
        </div>

        {/* Secondary Magic Link Option */}
        <div className="bg-base-200/50 rounded-lg p-6">
          <h3 className="font-medium text-base-content/80 mb-4 text-center">
            Sign in with Email
          </h3>
          <form
            className="form-control w-full space-y-4"
            onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
          >
            <input
              required
              type="email"
              value={email}
              autoComplete="email"
              placeholder="tom@cruise.com"
              className="input input-bordered w-full placeholder:opacity-60"
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className="btn btn-outline btn-block"
              disabled={isLoading || isDisabled}
              type="submit"
            >
              {isLoading && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              Send Magic Link
            </button>
          </form>
        </div>

        {/* Trust signals */}
        <div className="text-center pt-6">
          <div className="flex items-center justify-center gap-8 text-sm text-base-content/60">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Secure & Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>No Spam</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

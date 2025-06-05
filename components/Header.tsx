"use client";

import { useState, useEffect, Suspense } from "react";
import type { JSX } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ButtonSignin from "./ButtonSignin";
import ButtonAccount from "./ButtonAccount";
import logo from "@/app/icon.png";
import config from "@/config";
import { createClient } from "@/libs/supabase/client";
import type { User } from '@supabase/supabase-js';

// A header with a logo on the left, links in the center (like Pricing, etc...), and a CTA (like Get Started or Login) on the right.
// The header is responsive, and on mobile, the links are hidden behind a burger button.
export default function Header() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const supabase = createClient();

  // setIsOpen(false) when the route changes (i.e: when the user clicks on a link on mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  // Optimized authentication detection
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Only set loading to true if we haven't checked auth yet
        if (!authChecked) {
          setLoading(true);
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (mounted) {
          setUser(user);
          setAuthChecked(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        if (mounted) {
          setUser(null);
          setAuthChecked(true);
          setLoading(false);
        }
      }
    };

    // Initial check - only if not already checked
    if (!authChecked) {
      checkAuth();
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthChecked(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, authChecked]);

  // Define navigation links based on authentication state
  const links = user 
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/', label: 'Home' },
        { href: '/pricing', label: 'Pricing' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/#features', label: 'Features' },
        { href: '/pricing', label: 'Pricing' },
      ];

  // Improved CTA rendering - show sign in button immediately if no user, even during loading
  const cta: JSX.Element = (
    <>
      {loading && !authChecked ? (
        <div className="btn btn-disabled">
          <span className="loading loading-spinner loading-xs"></span>
        </div>
      ) : user ? (
        <ButtonAccount />
      ) : (
        <ButtonSignin extraStyle="btn-primary" />
      )}
    </>
  );

  return (
    <Suspense fallback={<div className="h-16 bg-white" />}>
      <header className="bg-base-200">
        <nav
          className="container flex items-center justify-between px-8 py-4 mx-auto"
          aria-label="Global"
        >
          {/* Your logo/name on large screens */}
          <div className="flex lg:flex-1">
            <Link
              className="flex items-center gap-2 shrink-0 "
              href="/"
              title={`${config.appName} homepage`}
            >
              <Image
                src={logo}
                alt={`${config.appName} logo`}
                className="w-8"
                placeholder="blur"
                priority={true}
                width={32}
                height={32}
              />
              <span className="font-extrabold text-lg">{config.appName}</span>
            </Link>
          </div>
          {/* Burger button to open menu on mobile */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
              onClick={() => setIsOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-base-content"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>

          {/* Your links on large screens */}
          <div className="hidden lg:flex lg:justify-center lg:gap-12 lg:items-center">
            {links.map((link, index) => (
              <Link
                href={link.href}
                key={link.href}
                className={`link link-hover ${
                  index === 0 && user ? 'text-primary font-semibold' : ''
                }`}
                title={link.label}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA on large screens */}
          <div className="hidden lg:flex lg:justify-end lg:flex-1">{cta}</div>
        </nav>

        {/* Mobile menu, show/hide based on menu state. */}
        <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
          <div
            className={`fixed inset-y-0 right-0 z-10 w-full px-8 py-4 overflow-y-auto bg-base-200 sm:max-w-sm sm:ring-1 sm:ring-neutral/10 transform origin-right transition ease-in-out duration-300`}
          >
            {/* Your logo/name on small screens */}
            <div className="flex items-center justify-between">
              <Link
                className="flex items-center gap-2 shrink-0 "
                title={`${config.appName} homepage`}
                href="/"
              >
                <Image
                  src={logo}
                  alt={`${config.appName} logo`}
                  className="w-8"
                  placeholder="blur"
                  priority={true}
                  width={32}
                  height={32}
                />
                <span className="font-extrabold text-lg">{config.appName}</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Your links on small screens */}
            <div className="flow-root mt-6">
              <div className="py-4">
                <div className="flex flex-col gap-y-4 items-start">
                  {links.map((link, index) => (
                    <Link
                      href={link.href}
                      key={link.href}
                      className={`link link-hover ${
                        index === 0 && user ? 'text-primary font-semibold text-lg' : ''
                      }`}
                      title={link.label}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="divider"></div>
              {/* Your CTA on small screens */}
              <div className="flex flex-col">{cta}</div>
            </div>
          </div>
        </div>
      </header>
    </Suspense>
  );
}

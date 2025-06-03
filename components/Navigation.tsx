"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ButtonSignin from "./ButtonSignin";
import ButtonAccount from "./ButtonAccount";
import logo from "@/app/icon.png";
import config from "@/config";
import { createClient } from "@/libs/supabase/client";

const navigation = {
  main: [
    { name: 'Home', href: '/' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Blog', href: '/blog' },
  ],
};

export default function Navigation() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [user, setUser] = useState(null);
  const supabase = createClient();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  // Get user session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <nav className="bg-base-200 border-b border-base-content/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Section: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center gap-2" title={`${config.appName} homepage`}>
              <Image
                src={logo}
                alt={`${config.appName} logo`}
                className="w-8"
                priority={true}
                width={32}
                height={32}
              />
              <span className="font-extrabold text-lg">{config.appName}</span>
            </Link>
          </div>

          {/* Center Section: Main Navigation (Desktop) */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-8">
              {navigation.main.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-base-content/80 hover:text-base-content font-medium transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Section: User Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <ButtonAccount />
              ) : (
                <ButtonSignin extraStyle="btn-primary" />
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
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
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div className="fixed inset-y-0 right-0 z-10 w-full px-8 py-4 overflow-y-auto bg-base-200 sm:max-w-sm sm:ring-1 sm:ring-base-content/10 transform origin-right transition ease-in-out duration-300">
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-2"
              href="/"
              title={`${config.appName} homepage`}
            >
              <Image
                src={logo}
                alt={`${config.appName} logo`}
                className="w-8"
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
          <div className="flow-root mt-6">
            <div className="py-4">
              <div className="flex flex-col gap-y-4 items-start">
                {navigation.main.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-base-content/80 hover:text-base-content font-medium"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="divider"></div>
            <div className="flex flex-col">
              {user ? (
                <ButtonAccount />
              ) : (
                <ButtonSignin extraStyle="btn-primary" />
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 
"use client";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import { Menu } from "@headlessui/react";
import { LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/libs/supabase/client";

export default function ProfileMenu() {
  const { user } = useSession();
  const supabase = createClient();
  const router = useRouter();

  if (!user) return null;

  const userName = 
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.email?.split('@')[0] ??
    "User";

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 rounded-md px-3 text-xs">
        {userName}
        <ChevronDown className="h-3 w-3 ml-1" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border bg-white py-2 shadow-lg dark:bg-slate-900 z-50">
        <Menu.Item>
          {({ active }) => (
            <a
              href="/dashboard"
              className={`block px-4 py-2 text-sm ${
                active ? 'bg-slate-100 dark:bg-slate-800' : ''
              } text-slate-700 dark:text-slate-200`}
            >
              Dashboard
            </a>
          )}
        </Menu.Item>

        <Menu.Item>
          {({ active }) => (
            <a
              href="/dashboard/settings"
              className={`block px-4 py-2 text-sm ${
                active ? 'bg-slate-100 dark:bg-slate-800' : ''
              } text-slate-700 dark:text-slate-200`}
            >
              Settings
            </a>
          )}
        </Menu.Item>
        <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={signOut}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                active ? 'bg-slate-100 dark:bg-slate-800' : ''
              } text-slate-700 dark:text-slate-200`}
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
} 
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { Button } from "@/components/ui/button";

export default function GetStartedButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthChecked(true);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    router.push(user ? "/dashboard" : "/signin");
  }

  // Don't show loading on initial render, only show it during click action
  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleClick}
      disabled={loading || !authChecked}
    >
      {loading ? "Loading…" : "Get Started"}
    </Button>
  );
} 
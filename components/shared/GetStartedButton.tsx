"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { Button } from "@/components/ui/button";

export default function GetStartedButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  if (loading) {
    return (
      <Button variant="default" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  const href = user ? "/dashboard" : "/auth";
  
  return (
    <Link href={href}>
      <Button variant="default" size="sm">
        Get Started
      </Button>
    </Link>
  );
} 
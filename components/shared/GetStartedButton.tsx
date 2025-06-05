"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/button";

export default function GetStartedButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { user } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="default"
      size={size}
      disabled={loading}
      onClick={() => {
        if (loading) return;
        setLoading(true);
        router.push(user ? "/dashboard" : "/auth");
      }}
    >
      {loading ? "Loading…" : "Get Started"}
    </Button>
  );
} 
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LimitReachedModal({
  open,
  onClose,
  wordsRemaining = 0,
}: {
  open: boolean;
  onClose: () => void;
  wordsRemaining?: number;
}) {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You&apos;ve reached your word limit</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {wordsRemaining > 0
            ? `You have only ${wordsRemaining.toLocaleString()} words remaining on your current plan.`
            : "You&apos;ve used 100% of the words included in your current plan."}
          {" "}Upgrade to keep humanizing text.
        </p>

        <DialogFooter className="pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              router.push("/pricing");
              onClose();
            }}
          >
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
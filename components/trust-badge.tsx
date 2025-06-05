import type React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface TrustBadgeProps {
  icon?: React.ReactNode
  text: string
  className?: string
}

export function TrustBadge({ icon, text, className }: TrustBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {icon || <CheckCircle2 className="h-4 w-4 text-soundrealBlue" />}
      <span>{text}</span>
    </div>
  )
}

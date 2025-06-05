import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showOneLiner?: boolean
}

export function Logo({ className, size = "md", showOneLiner = false }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  }

  return (
    <Link href="/" className={cn("flex flex-col group", className)}>
      <h1 className={cn("font-heading font-bold", sizeClasses[size])}>
        Sound<span className="text-soundrealBlue group-hover:opacity-80 transition-opacity">Real</span>
      </h1>
      {showOneLiner && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Transform AI-generated content into natural, undetectable prose.
        </p>
      )}
    </Link>
  )
}

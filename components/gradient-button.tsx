import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const gradientButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.03] active:scale-[0.98] active:brightness-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:brightness-110 shadow-soft",
        outline: "border border-soundrealBlue bg-transparent text-soundrealBlue hover:bg-soundrealBlue/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
  isLoading?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, children, icon, iconPosition = "left", ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {asChild ? (
          // If asChild is true, Slot will render the children directly.
          // Icons and loading states should be part of the child component passed by the user.
          children
        ) : (
          // If not asChild, render as a regular button with internal icon/loader support.
          <>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
            {children}
            {!isLoading && icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
          </>
        )}
      </Comp>
    )
  },
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }

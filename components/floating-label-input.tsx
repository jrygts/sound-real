"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
  label: string
  wrapperClassName?: string
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, type, label, id, wrapperClassName, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!event.target.value)
      if (props.onChange) {
        props.onChange(event)
      }
    }

    const uniqueId = React.useId()
    const inputId = id || uniqueId

    return (
      <div className={cn("relative", wrapperClassName)}>
        <Input
          ref={ref}
          id={inputId}
          type={type}
          className={cn("peer pt-5 h-14", className)}
          placeholder=" " // Important: space placeholder for peer to work
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleInputChange}
          value={props.value}
          defaultValue={props.defaultValue}
          {...props}
        />
        <Label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-3 peer-focus:text-xs peer-focus:text-soundrealBlue",
            (isFocused || hasValue) && "top-3 text-xs",
            isFocused && "text-soundrealBlue",
          )}
        >
          {label}
        </Label>
      </div>
    )
  },
)
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }

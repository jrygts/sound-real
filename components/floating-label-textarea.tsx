import * as React from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface FloatingLabelTextareaProps extends React.ComponentProps<"textarea"> {
  label: string
  wrapperClassName?: string
}

const FloatingLabelTextarea = React.forwardRef<HTMLTextAreaElement, FloatingLabelTextareaProps>(
  ({ className, label, id, wrapperClassName, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)

    const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!event.target.value)
      if (props.onChange) {
        props.onChange(event)
      }
    }

    const uniqueId = React.useId()
    const textareaId = id || uniqueId

    return (
      <div className={cn("relative", wrapperClassName)}>
        <Textarea
          ref={ref}
          id={textareaId}
          className={cn("peer pt-5 min-h-[120px]", className)} // Adjust min-h as needed
          placeholder=" " // Important: space placeholder for peer to work
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleTextareaChange}
          {...props}
        />
        <Label
          htmlFor={textareaId}
          className={cn(
            "absolute left-3 top-5 -translate-y-1/2 text-muted-foreground transition-all duration-200 ease-out peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-3 peer-focus:text-xs peer-focus:text-soundrealBlue",
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
FloatingLabelTextarea.displayName = "FloatingLabelTextarea"

export { FloatingLabelTextarea }

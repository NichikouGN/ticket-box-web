import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm text-foreground placeholder:text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
        published: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        draft: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
        cancelled: "bg-red-500/15 text-red-400 border border-red-500/20",
        secondary: "bg-slate-800 text-slate-300 border border-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

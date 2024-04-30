import { LucideProps } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@classy/lib";

const logoVariants = cva("flex items-center justify-center", {
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      icon: "text-base",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    size: "default",
  },
});

export interface LogoProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof logoVariants> {
  iconProps?: LucideProps;
}

const Logo = ({ className, orientation, size = "default" }: LogoProps) => {
  return (
    <div className={cn(logoVariants({ orientation, size, className }))}>
      <i
        className={cn(
          "nes-octocat animate",
          "!w-[42px] !h-[45px] scale-50 -translate-x-1/4 -translate-y-1/4"
        )}
      ></i>
      {size !== "icon" && (
        <span className="px-2 md-2 font-bold">ClassyGit</span>
      )}
    </div>
  );
};

export default Logo;

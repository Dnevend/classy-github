import { Github, LucideProps } from "lucide-react";
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

const Logo = ({
  className,
  orientation,
  size = "default",
  iconProps,
}: LogoProps) => {
  const iconSize: Record<Exclude<typeof size, null | undefined>, string> = {
    default: "32",
    sm: "24",
    lg: "40",
    icon: "32",
  };

  return (
    <div className={cn(logoVariants({ orientation, size, className }))}>
      <Github color="#f00" size={iconSize[size!]} {...iconProps} />
      {size !== "icon" && <span className="px-2 font-bold">ClassyGit</span>}
    </div>
  );
};

export default Logo;

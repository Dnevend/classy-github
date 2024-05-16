import Logo from "@/components/logo";
import SvgLoading from "@/components/loading";
import { cn } from "@classy/lib";

export const Loading = () => (
  <div
    className={cn(
      "flex flex-col gap-6 items-center justify-center text-xl",
      "relative bg-white/85 dark:bg-zinc-900/80"
    )}
  >
    <Logo size="icon" />
    <SvgLoading />
  </div>
);

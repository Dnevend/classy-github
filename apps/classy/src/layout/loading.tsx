import Logo from "@/components/logo";
import SvgLoading from "@/components/loading";
import { cn } from "@classy/lib";

export const Loading = () => (
  <div
    className={cn(
      "h-full flex flex-col gap-6 items-center justify-center text-xl",
      "relative bg-white/85 ring-1 ring-zinc-100 dark:bg-zinc-900/80 dark:ring-zinc-400/20"
    )}
  >
    <Logo size="icon" />
    <SvgLoading />
  </div>
);

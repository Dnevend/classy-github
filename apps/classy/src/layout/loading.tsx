import Logo from "@/components/logo";
import SvgLoading from "@/components/loading";

export const Loading = () => (
  <div className="h-full flex flex-col gap-6 items-center justify-center text-xl">
    <Logo size="icon" />
    <SvgLoading />
  </div>
);

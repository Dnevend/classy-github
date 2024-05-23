import Logo from "@/components/logo";
import SvgLoading from "@/components/loading";

export const Loading = () => (
  <div className={"flex flex-col gap-4 items-center justify-center text-xl"}>
    <Logo size="icon" />
    <SvgLoading />
  </div>
);

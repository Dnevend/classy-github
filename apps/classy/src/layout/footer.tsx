import { ThemeSelect } from "@/components/theme-select";
import { cn, redirectTheme } from "@classy/lib";
import { repoUrl } from "@classy/shared";
import { ClassyConfig } from "@classy/types";
import { Link } from "react-router-dom";
export const Footer = ({ links = [] }: { links: ClassyConfig["links"] }) => {
  return (
    <footer
      className={cn(
        "text-gray-500 px-4 py-5 w-full mx-auto md:px-8 border-t border-white",
        "relative bg-white/90 ring-1 ring-zinc-100 dark:bg-zinc-900/80 dark:ring-zinc-400/20"
      )}
    >
      <ul className="items-center justify-center mt-6 space-y-5 sm:flex sm:space-x-4 sm:space-y-0">
        {(links || []).map((item, idx) => (
          <li className="hover:text-gray-800">
            <Link key={idx} to={item.href} target="_blank">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 items-center justify-between sm:flex">
        <div className="mt-4 sm:mt-0 text-sm">
          Powered by{" "}
          <Link
            to={repoUrl}
            target="_blank"
            className="font-bold hover:text-blue-500"
          >
            <code>ClassyGit</code>
          </Link>
          .
        </div>
        <div className="mt-6 sm:mt-0 flex items-center gap-2 border rounded-full pr-4 hover:shadow">
          <ThemeSelect
            className="border-none rounded-full w-[100px]"
            onSelectChange={(theme) => redirectTheme(theme)}
          />
          <span className="text-sm italic">Theme</span>
        </div>
      </div>
    </footer>
  );
};

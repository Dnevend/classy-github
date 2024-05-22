import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@classy/lib";
import { Repo } from "@classy/types";
import { GitFork, Star } from "lucide-react";
import { Link } from "react-router-dom";

const RepoCard = ({
  user,
  repo,
  className,
}: {
  user: string;
  repo: Repo;
  className: string;
}) => (
  <Link
    to={`/${user}/repo/${repo.name}`}
    className={cn(
      "flex flex-col justify-between h-auto w-full p-4 border rounded-lg hover:shadow text-wrap break-words",
      className
    )}
  >
    <div>
      <h3
        className={cn(
          "text-lg font-bold line-clamp-1",
          "bg-gradient-to-r bg-clip-text text-transparent",
          "from-slate-900 to-slate-500 dark:from-slate-300 dark:to-slate-50"
        )}
      >
        {repo.name}
      </h3>
      {repo.description && (
        <Tooltip>
          <TooltipTrigger>
            <p className="text-xs text-slate-500 text-start line-clamp-3">
              {repo.description}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm max-w-60">{repo.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>

    <div>
      <Separator className="mt-4 mb-2" />

      <div className="flex gap-3">
        <span className="flex items-center gap-1 text-sm">
          <Star size={12} />
          <span>{repo.stargazers_count}</span>
        </span>
        <span className="flex items-center gap-1 text-sm">
          <GitFork size={12} />
          <span>{repo.forks_count}</span>
        </span>
      </div>
    </div>
  </Link>
);

export default RepoCard;

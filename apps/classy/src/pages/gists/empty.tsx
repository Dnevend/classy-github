import { Button } from "@/components/ui/button";
import { cn, useClassyConfig, useClassyParams } from "@classy/lib";
import { githubUrl } from "@classy/shared";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const GistsEmpty = ({ type }: { type?: string }) => {
  const { user } = useClassyParams();

  const { gists } = useClassyConfig(user);

  const { prefix, split } = gists;

  const tips = `你需要在Gists描述中包含 \`${prefix}${split}${type}${split}自定义标题\` 信息`;

  return (
    <div
      className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-12"
      x-chunk="dashboard-02-chunk-1"
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-2xl font-bold tracking-tight">{`You have no ${
          type || ""
        } gists`}</h3>
        <p className="text-sm text-muted-foreground">
          {`Click to add your first ${type || ""} gists.`}
        </p>
        {type && <p className="text-sm text-muted-foreground">{tips}</p>}
        <Button className="mt-4" asChild>
          <Link
            to={`${githubUrl.gists}/${user}`}
            target="_blank"
            className={cn(
              "flex items-center gap-2 w-fit mx-auto mt-6 text-sm text-gray-600 hover:text-black"
            )}
          >
            Create Gists
            <ExternalLink size={14} className="ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default GistsEmpty;

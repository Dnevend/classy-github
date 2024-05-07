import { useRef, useEffect } from "react";
import { drawContributions } from "github-contributions-canvas";
import { serviceFetchFunc, useClassyParams } from "../../../lib";

export const GithubContributionsChart = () => {
  const { user } = useClassyParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    serviceFetchFunc.githubContributions(user).then((res) => {
      drawContributions(canvasRef.current!, {
        data: res,
        username: user,
        themeName: "classic",
        // footerText:
        //   "Made by @sallar & friends - github-contributions.vercel.app",
      });
    });
  };

  useEffect(() => {
    draw();
  }, []);

  return <canvas ref={canvasRef} />;
};

import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Link } from "react-router-dom";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { cn, getCurrentTheme } from "@classy/lib";
import { ThemeSelect } from "./components/theme-select";
import { useNProgress } from "./hooks/useNProgress";
import { AnimatePresence, motion } from "framer-motion";

const words = ["定制主页", "个人博客", "随笔记录"];

function App() {
  useNProgress();
  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>(getCurrentTheme("default"));

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, 3000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col gap-6 justify-center items-center dark:bg-black"
      )}
    >
      <div
        className={cn(
          "pointer-events-none dark:bg-black bg-white dark:bg-grid-small-white/[0.2] bg-grid-small-black/[0.2] relative flex items-center justify-center",
          "fixed inset-0"
        )}
      />

      <Logo />

      <code className="text-center">
        <span className="mr-2 font-bold">无需部署，即刻访问你的</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={words[index]}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "text-center font-display text-xl font-bold tracking-[-0.02em] drop-shadow-sm md:text-2xl",
              "bg-gradient-to-r from-neutral-600 to-neutral-900 dark:from-neutral-300 dark:to-neutral-600 bg-clip-text text-transparent"
            )}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </code>

      <div className="flex gap-2 p-6">
        <Input
          id="username"
          placeholder="Your github username"
          className="bg-zinc-50 dark:bg-black"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <ThemeSelect
          onSelectChange={(theme) => setTheme(theme)}
          className="bg-zinc-50 dark:bg-black"
        />

        <Button asChild>
          <Link
            to={
              theme !== getCurrentTheme()
                ? `https://${themeDomains[theme]}/${username}`
                : `${username}`
            }
            className="animate-shimmer rounded-md border bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Enter
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { cn, getCurrentTheme } from "@classy/lib";
import { ThemeSelect } from "./components/theme-select";
import { useNProgress } from "./hooks/useNProgress";
import { AnimatePresence, motion } from "framer-motion";

const FADE_DOWN_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" } },
};

const words = ["定制主页", "个人博客", "随笔记录"];

function App() {
  useNProgress();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>(getCurrentTheme("default"));

  const [index, setIndex] = useState(0);

  /** 首页 */
  const homePage =
    theme !== getCurrentTheme() ? `https://${themeDomains[theme]}/${username}` : `${username}`;

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, 3000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  /** 监听回车键 -> 触发跳转 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        navigate(homePage);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homePage]);


  return (
    <motion.div
      className={cn(
        "min-h-dvh flex flex-col gap-6 justify-center items-center dark:bg-black"
      )}
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      }}
    >
      <div
        className={cn(
          "pointer-events-none dark:bg-black bg-white dark:bg-grid-small-white/[0.2] bg-grid-small-black/[0.2] relative flex items-center justify-center",
          "fixed inset-0"
        )}
      />

      <motion.div variants={FADE_DOWN_ANIMATION_VARIANTS}>
        <Logo />
      </motion.div>

      <motion.div
        className="text-center"
        variants={FADE_DOWN_ANIMATION_VARIANTS}
      >
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
      </motion.div>

      <motion.div
        className="flex gap-2 p-6"
        variants={FADE_DOWN_ANIMATION_VARIANTS}
      >
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
            to={homePage}
            className="animate-shimmer rounded-md border bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Enter
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default App;

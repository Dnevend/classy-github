import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Link } from "react-router-dom";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { cn, getCurrentTheme } from "@classy/lib";
import { ThemeSelect } from "./components/theme-select";

function App() {
  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>(getCurrentTheme("default"));

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

      <div className="flex gap-2 p-6">
        <Input
          id="username"
          placeholder="Your github username"
          className="bg-zinc-50"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <ThemeSelect
          onSelectChange={(theme) => setTheme(theme)}
          className="bg-zinc-50"
        />

        <Button asChild>
          <Link
            to={
              theme !== getCurrentTheme()
                ? `https://${themeDomains[theme]}/${username}`
                : `${username}`
            }
            className="animate-shimmer rounded-md border bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            Enter
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default App;

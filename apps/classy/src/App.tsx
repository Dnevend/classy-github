import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Link } from "react-router-dom";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { getCurrentTheme } from "@classy/lib";
import { ThemeSelect } from "./components/theme-select";

function App() {
  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>(getCurrentTheme("default"));

  return (
    <div className="min-h-screen flex flex-col gap-6 justify-center items-center">
      <Logo />

      <div className="flex gap-2 p-6">
        <Input
          id="username"
          placeholder="Your github username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <ThemeSelect onSelectChange={(theme) => setTheme(theme)} />

        <Button asChild>
          <Link
            to={
              theme !== getCurrentTheme()
                ? `https://${themeDomains[theme]}/${username}`
                : `${username}`
            }
          >
            Enter
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default App;

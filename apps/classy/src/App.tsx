import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { getCurrentTheme } from "@classy/lib";

function App() {
  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>("default");

  return (
    <div className="min-h-screen flex flex-col gap-6 justify-center items-center">
      <Logo />

      <div className="flex gap-2">
        <Input
          placeholder="Your github username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Select
          defaultValue={getCurrentTheme()}
          onValueChange={(v: Theme) => setTheme(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(themeDomains).map(([theme]) => (
              <SelectItem key={theme} value={theme}>
                {theme}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

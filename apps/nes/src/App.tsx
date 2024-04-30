import { useState } from "react";
import { Button } from "./components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import Logo from "./components/logo";
import { Theme } from "@classy/shared";
import { useTranslation } from "react-i18next";

const ThemeRoute: Record<Theme, { label: string; route: string }> = {
  default: { label: "Default", route: "/" },
  nes: { label: "NES", route: "/nes/" },
};

function App() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [username, setUsername] = useState<string>();
  const [theme, setTheme] = useState<Theme>("default");

  return (
    <div className="min-h-screen flex flex-col gap-6 justify-center items-center">
      <Logo />

      {t("welcome")}

      <Select
        defaultValue={i18n.language}
        onValueChange={(v: string) => i18n.changeLanguage(v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Lng" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="zh">中文</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="nes-input"
        />

        <div className="nes-select">
          <select
            required
            defaultValue="default"
            aria-placeholder="theme"
            onChange={(e) => {
              setTheme(e.target.value as Theme);
            }}
          >
            {Object.entries(ThemeRoute).map(([theme, prop]) => (
              <option key={theme} value={theme}>
                {prop.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={() =>
            username && navigate(`${ThemeRoute[theme].route}${username}`)
          }
          asChild
        >
          <button type="button" className="nes-btn is-primary">
            Enter
          </button>
        </Button>
      </div>
    </div>
  );
}

export default App;

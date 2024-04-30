import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
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

      <div className="flex gap-2">
        <Input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Select
          defaultValue="default"
          onValueChange={(v: Theme) => setTheme(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ThemeRoute).map(([theme, prop]) => (
              <SelectItem key={theme} value={theme}>
                {prop.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() =>
            username && navigate(`${ThemeRoute[theme].route}${username}`)
          }
        >
          Enter
        </Button>
      </div>
    </div>
  );
}

export default App;

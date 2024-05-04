import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./components/logo";
import { Theme, themeDomains } from "@classy/shared";
import { getCurrentTheme } from "@classy/lib";

function App() {
  const [username, setUsername] = useState<string>("");
  const [theme, setTheme] = useState<Theme>("default");

  return (
    <div className="min-h-screen flex flex-col gap-6 justify-center items-center p-2">
      <Logo />

      <div className="flex flex-col items-center gap-2 text-xs">
        <div className="flex gap-2">
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
              defaultValue={getCurrentTheme("nes")}
              aria-placeholder="theme"
              onChange={(e) => {
                setTheme(e.target.value as Theme);
              }}
            >
              {Object.entries(themeDomains).map(([theme]) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Link
          to={
            theme !== getCurrentTheme("nes")
              ? `https://${themeDomains[theme]}/${username}`
              : `${username}`
          }
        >
          <button type="button" className="nes-btn is-primary">
            Enter
          </button>
        </Link>
      </div>
    </div>
  );
}

export default App;

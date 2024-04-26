import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import viteLogo from "/vite.svg";
import { useNavigate } from "react-router";

function App() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>();

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} alt="React logo" />
        </a>
      </div>
      <h1>Github Profile</h1>
      <div className="flex">
        <Input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button onClick={() => navigate(`${username}`)}>Enter</Button>
      </div>
    </>
  );
}

export default App;

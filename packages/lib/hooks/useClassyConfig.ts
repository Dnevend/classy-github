import { githubUrl, repoName, userConfigFile } from "@classy/shared";
import { useEffect, useState } from "react";
import { ClassyConfig } from "@classy/types";
import { storeGet, storeSet } from "../cache";

import defaultConfig from "../../../classy.config.json";

export const useClassyConfig = (user?: string) => {
  const [userConfig, setUserConfig] = useState<ClassyConfig>(
    storeGet(`config_${user}`, defaultConfig) as ClassyConfig
  );

  useEffect(() => {
    const init = async () => {
      if (!user) {
        return defaultConfig;
      }

      const configFilePath = `${githubUrl.raw}/${user}/${repoName}/main/${userConfigFile}`;

      try {
        const configRes = await fetch(configFilePath);
        if (configRes.ok) {
          const config = await configRes.json();
          setUserConfig(config as ClassyConfig);
          storeSet(`config_${user}`, config);
        }
      } catch {
        return defaultConfig;
      }
    };

    init();
  }, [user]);

  return userConfig;
};

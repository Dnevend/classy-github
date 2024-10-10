import { githubUrl, repoName, userConfigFile } from "@classy/shared";
import { useCallback, useEffect, useState } from "react";
import { ClassyConfig } from "@classy/types";
import { storeGet, storeSet } from "../cache";

import defaultConfig from "../../../classy.config.json";

export const useClassyConfig = (user?: string) => {
  const [userConfig, setUserConfig] = useState<ClassyConfig>(
    storeGet(`config_${user}`, defaultConfig) as ClassyConfig
  );

  const fetchUserConfig = useCallback(async () => {
    if (!user) {
      return defaultConfig;
    }

    const configFilePath = `${githubUrl.raw}/${user}/${repoName}/main/${userConfigFile}`;

    try {
      const configRes = await fetch(configFilePath);
      if (configRes.ok) return configRes.json();
    } catch {
      return defaultConfig;
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const _userConfig = await fetchUserConfig();
      setUserConfig(_userConfig as ClassyConfig);
      storeSet(`config_${user}`, _userConfig);
    };

    init();
  }, [fetchUserConfig]);

  return userConfig;
};

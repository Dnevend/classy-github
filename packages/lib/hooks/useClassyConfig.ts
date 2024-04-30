import { defaultConfig, githubUrl } from '@classy/shared'

import { useCallback, useEffect, useState } from 'react'

export const useClassyConfig = (user: string) => {

    // if (!user) {
    //     throw Error('Please assign a user!')
    //     return defaultConfig
    // }

    const [userConfig, setUserConfig] = useState<Record<string, any> | null>(null)

    const fetchUserConfig = useCallback(async () => {
        const configFilePath = githubUrl.userConfigFilepath(user)

        try {
            const configRes = await fetch(configFilePath)

            return configRes
        } catch {
            return defaultConfig
        }

    }, [user])

    useEffect(() => {
        const init = async () => {
            const _userConfig = await fetchUserConfig()
            setUserConfig(_userConfig)
        }

        init()
    }, [fetchUserConfig])

    return userConfig
}
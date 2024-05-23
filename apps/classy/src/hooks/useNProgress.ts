import { useEffect } from "react";
import { useNavigation } from "react-router-dom";
import NProgress from 'nprogress'
export const useNProgress = () => {
    const { state } = useNavigation();

    useEffect(() => {
        if (state === "loading") {
            NProgress.set(0.3);
        }
        if (state === "idle") {
            NProgress.done();
        }
    }, [state]);
}
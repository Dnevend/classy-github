import { useEffect, useState } from "react";

export const useExpand = ({
    domTarget,
    overflowHeight,
    defaultExpand = false
}: { domTarget: string | HTMLElement | null, overflowHeight: number, defaultExpand?: boolean }) => {

    const [expanded, setExpanded] = useState<boolean>(defaultExpand);
    const [isOverflow, setIsOverflow] = useState<boolean>(false);

    const toggleExpand = () => setExpanded(!expanded)

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            const [entry] = entries;
            const height = entry.contentRect.height;
            setIsOverflow(height > overflowHeight);
        });

        const target = typeof domTarget === 'string' ? document.querySelector(domTarget) : domTarget

        target && observer.observe(target);

        return () => {
            target && observer.unobserve(target);
        };
    }, [domTarget, overflowHeight]);

    return { expand: expanded, isOverflow, toggleExpand }

}
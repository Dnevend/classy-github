import { useClassyConfig } from "@classy/lib";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export const useGistsType = (user: string) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const classyConfig = useClassyConfig(user);

    const searchType = searchParams.get("type");

    const defaultType = { name: "all" };

    const gistTypes = classyConfig?.gists?.type || [];

    const onChangeType = (type: string) => {
        navigate(
            { pathname: location.pathname, search: `type=${type}` },
            { replace: true }
        );
    };

    const getDefaultType = () => {
        if (!searchType) return classyConfig.gists.default || defaultType.name;
        if (
            searchType !== defaultType.name &&
            !gistTypes.some((it) => it.name.toLowerCase() === searchType)
        )
            return defaultType.name;
        return searchType;
    };

    return { defaultType, gistTypes, onChangeType, getDefaultType }
}
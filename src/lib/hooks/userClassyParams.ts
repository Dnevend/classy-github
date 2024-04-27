import { useParams } from "react-router"

export const useClassyParams = () => {
    const params = useParams() as { user: string, gistId: string }

    return params
}
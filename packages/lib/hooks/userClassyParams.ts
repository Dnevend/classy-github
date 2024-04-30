import { useParams } from "react-router-dom"

export const useClassyParams = () => {
    const params = useParams() as { user: string, gistId: string }

    return params
}
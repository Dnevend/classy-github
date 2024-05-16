/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, ReactNode, ErrorInfo } from "react";
import Logo from "./logo";
import { Button } from "./ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col gap-2 items-center justify-center">
          <Logo size="icon" />
          <h1>Something went wrong.</h1>
          <Button onClick={() => window.location.reload()}>
            Reload
            <RotateCcw size={16} className="ml-2" />
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

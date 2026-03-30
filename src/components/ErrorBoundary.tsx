import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.name || "a component"}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="my-(--space-2) rounded-theme border-[color:color-mix(in_oklab,var(--status-error)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--status-error)_10%,transparent)] p-(--space-4) text-sm text-[color:var(--status-error)]">
          <p className="font-bold">Something went wrong.</p>
          <p className="opacity-80 text-xs mt-(--space-1) font-mono">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

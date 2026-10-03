import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[BB Connect ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleRecover = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch (e) {
      window.location.href = '/#/partner/dashboard';
    }
  };

  public render() {
    return this.props.children;
  }
}

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
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center font-sans">
          <div className="bg-white border-2 border-black p-8 rounded-3xl shadow-xl max-w-md w-full">
            <div className="w-14 h-14 bg-blue-50 text-[#0056b3] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
              💈
            </div>
            <h2 className="text-xl font-black text-black uppercase tracking-tight mb-2">
              {this.props.fallbackTitle || 'Session Refresh Required'}
            </h2>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">
              We recovered a connection interruption. Tap below to reload your dashboard cleanly.
            </p>
            <button
              onClick={this.handleRecover}
              className="w-full py-3.5 bg-black hover:bg-[#0056b3] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              🔄 Refresh & Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

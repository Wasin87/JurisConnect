import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('JurisConnect ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let parsedMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error) {
          parsedMsg = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
        }
      } catch {
        // non-JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6FAF8] dark:bg-[#07120E] px-6 py-12">
          <div className="max-w-lg w-full bg-white dark:bg-[#0D1B16] border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="font-sans text-xl font-semibold">Application Recovery</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 break-words">
              {parsedMsg}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reload JurisConnect
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

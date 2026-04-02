import { Component } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-error-light)] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-[var(--color-error-text)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.24 3.957l-8.422 14.06a1.989 1.989 0 0 0 1.7 2.983h16.845a1.989 1.989 0 0 0 1.7 -2.983l-8.423 -14.06a1.989 1.989 0 0 0 -3.4 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Something went wrong</h1>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mb-6">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-medium rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:bg-white transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

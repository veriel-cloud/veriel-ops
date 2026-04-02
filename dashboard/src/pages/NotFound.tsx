import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-[72px] font-bold text-[var(--color-text-quaternary)] leading-none mb-2">404</h1>
        <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">Page not found</p>
        <p className="text-[13px] text-[var(--color-text-tertiary)] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-medium rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:bg-white transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

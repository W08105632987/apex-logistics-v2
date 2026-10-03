import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

/** Prevents an unexpected component error from leaving users with a blank application. */
export class AppErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the user-facing message generic; deployment logging can be added without exposing details.
    console.error('Apex Logistics UI error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
        <section role="alert" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-800">Apex Logistics</div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page needs a fresh start.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">An unexpected display error interrupted this view. Your saved shipment records remain on the server. Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#071626] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700">Reload application</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

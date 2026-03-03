"use client";

import React from "react";
import { getAirbrake } from "@/lib/airbrake";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class AirbrakeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const airbrake = getAirbrake();
    if (airbrake) {
      airbrake.notify({
        error,
        params: { reactErrorInfo: info },
      });
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Something went wrong
          </h1>
          <p className="text-gray-600">
            We’ve been notified. Try refreshing the page, or come back later.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

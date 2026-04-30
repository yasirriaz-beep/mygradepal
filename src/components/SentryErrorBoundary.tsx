"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class SentryErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div>
          <h2>Something went wrong.</h2>
        </div>
      );
    }

    return this.props.children;
  }
}

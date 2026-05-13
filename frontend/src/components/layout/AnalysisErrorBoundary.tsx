import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Isolates board/sidebar crashes so the shell can offer recovery. */
export class AnalysisErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {}

  handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto mt-16 p-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
          <p className="text-sm text-[var(--color-text-primary)] mb-2">Something went wrong in the analysis view.</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Reload the page to continue.</p>
          <Button type="button" onClick={this.handleReset}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

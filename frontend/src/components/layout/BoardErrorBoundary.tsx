import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Isolates the board subtree so a render error does not take down the whole analysis shell. */
export class BoardErrorBoundary extends Component<Props, State> {
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
        <div className="w-[min(100%,28rem)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-center text-sm">
          <p className="text-[var(--color-text-primary)] mb-1">The board could not be displayed.</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Reload to reset the view.</p>
          <Button type="button" onClick={this.handleReset}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

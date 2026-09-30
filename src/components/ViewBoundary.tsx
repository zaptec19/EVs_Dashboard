import { Component, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { common } from '../content';

/** If one view throws, show a clear message in its place instead of blanking the whole page. */
export class ViewBoundary extends Component<{ name: string; className: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(`View "${this.props.name}" failed`, err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className={`card ${this.props.className}`} role="alert">
        <div className="empty empty-error"><CircleAlert size={18} aria-hidden className="error-icon" />{common.viewError(this.props.name)}</div>
      </section>
    );
  }
}

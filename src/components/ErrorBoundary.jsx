import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error){
    return { hasError: true, error };
  }
  componentDidCatch(error, info){
    console.error('[ErrorBoundary]', error, info);
  }
  handleReload = () => {
    window.location.reload();
  };
  render(){
    if (this.state.hasError) {
      return (
        <div className="error-boundary-overlay" role="alert" aria-live="assertive">
          <div className="error-boundary-panel">
            <h2>Something went wrong</h2>
            <pre className="error-stack">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button onClick={this.handleReload} aria-label="Reload Application">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
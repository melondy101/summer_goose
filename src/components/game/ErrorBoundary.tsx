import { Component, type ErrorInfo, type ReactNode } from "react";
import { AMAN_IMAGE } from "@/game/artwork";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * 全局兜底：任何未捕获的渲染异常都落到这里。
 * 「刷新」会带着存档回到原地，所以文案承诺还能接着捡。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("界面出错了", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <img src={AMAN_IMAGE} alt="大鹅阿满" className="h-28 w-28 rounded-card border-2 border-outline bg-card object-cover p-1" draggable={false} />
        <h1 className="text-xl font-bold text-ink">阿满摔了一跤</h1>
        <p className="text-sm leading-relaxed text-ink/85">
          布袋里的东西撒了一地。刷新一下，捡回来的还在。
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          data-testid="recover-reload"
          className="h-12 rounded-card border-2 border-outline bg-bag px-6 text-base font-medium text-ground hover:bg-vein"
        >
          拍拍土，继续
        </button>
      </main>
    );
  }
}

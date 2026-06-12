import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Global Error Boundary] Erro não capturado interceptado:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    console.log("[Global Error Boundary] Tentando recuperar de erro reiniciando estado...");
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    window.location.reload();
  };

  private handleCopyError = () => {
    if (!this.state.error) return;
    const errorDetails = `Erro: ${this.state.error.message}\n\nStack Trace:\n${this.state.error.stack || ""}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="bg-white rounded-3xl border border-red-100 shadow-xl max-w-lg w-full p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 text-red-600 border border-red-100">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Instabilidade Detectada
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                O Familink Saúde detectou uma instabilidade em um dos componentes e evitou que o aplicativo travasse em uma tela branca.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-red-600 block">
                  Detalhes Técnicos
                </span>
                <p className="text-xs font-mono text-gray-700 break-all select-all font-medium bg-red-50/30 p-2.5 rounded-lg border border-red-100/50">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 text-center"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Aplicativo
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="w-full py-3 px-5 bg-white hover:bg-slate-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-400" />
                    Copiar Detalhes
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-gray-400 select-none">
              Seu histórico clínico continua seguro e salvo localmente.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

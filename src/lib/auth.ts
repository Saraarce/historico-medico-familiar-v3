import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets full edit scope, and full Google Drive scope (needed for reading/writing shared files)
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive");

// Force Google to show the consent dialog screen to ensure all scopes (especially drive.readonly for shared files) are explicitly approved by the user
provider.setCustomParameters({
  prompt: "consent",
  access_type: "offline"
});

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("google_oauth_token") : null;

// Helper to mask PII for secure execution logging
const maskEmail = (email: string | null | undefined): string => {
  if (!email) return "Nenhum";
  const parts = email.split("@");
  if (parts.length !== 2) return "Usuário Protegido";
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local[0] || ""}***`;
  return `${maskedLocal}@${domain}`;
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  console.log("[Google Auth] Inicializando escuta de estado de autenticação Firebase...");
  return onAuthStateChanged(auth, async (user: User | null) => {
    console.log("[Google Auth] onAuthStateChanged disparado. Status Usuário:", user ? `Conectado (${maskEmail(user.email)})` : "Nenhum");
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = typeof window !== "undefined" ? localStorage.getItem("google_oauth_token") : null;
        console.log("[Google Auth] Buscando token cacheado de localStorage:", cachedAccessToken ? "Encontrado" : "Não encontrado");
      }
      if (cachedAccessToken) {
        console.log("[Google Auth] Sucesso: Usuário autenticado no Firebase e token de acesso OAuth disponível.");
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        console.warn("[Google Auth] Alerta: Usuário está autenticado no Firebase, mas não possui token do Google Drive armazenado no dispositivo.");
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      console.log("[Google Auth] Ninguém logado no Firebase. Mantendo token em localStorage para resiliência de recarregamento.");
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in popup flow
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    console.log("[Google Auth] Iniciando fluxo de Sign-In do Google via Popup...");
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    console.log("[Google Auth] Login efetuado com sucesso para o usuário:", maskEmail(result.user.email));
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.error("[Google Auth] Erro Crítico: Credencial retornada não contém token de acesso OAuth.");
      throw new Error("Não foi possível adquirir o token de acesso do Google.");
    }

    cachedAccessToken = credential.accessToken;
    console.log("[Google Auth] Token de acesso obtido com sucesso! Persistindo no localStorage.");
    if (typeof window !== "undefined") {
      localStorage.setItem("google_oauth_token", cachedAccessToken);
      localStorage.setItem("google_oauth_token_timestamp", String(Date.now()));
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("[Google Auth] Falha crítica no fluxo de assinatura/Sign-In:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const isTokenExpired = (): boolean => {
  if (typeof window === "undefined") return true;
  const token = localStorage.getItem("google_oauth_token");
  if (!token) return true;
  const timestampStr = localStorage.getItem("google_oauth_token_timestamp");
  if (!timestampStr) return false; // Trata como válido até um erro 401 real ocorrer
  const timestamp = Number(timestampStr);
  const oneHour = 3600 * 1000;
  // Expira propositalmente 2 minutos antes para evitar condições de corrida
  return Date.now() - timestamp > (oneHour - 2 * 60 * 1000);
};

export const logout = async () => {
  console.log("[Google Auth] Executando log-out do Firebase e removendo credenciais.");
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("google_oauth_token");
    localStorage.removeItem("google_oauth_token_timestamp");
  }
  console.log("[Google Auth] Logout completo.");
};

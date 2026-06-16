/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { 
  HeartPulse, BrainCircuit, Bell, Settings, Award, Users, 
  Plus, Edit3, CheckCircle, Smartphone, Info, Save, X, Database,
  Cloud, RefreshCw, AlertTriangle, Download, Trash2, LogOut
} from "lucide-react";

import { FamilyMember, Consultation, Exam, HealthVital, Vaccine } from "./types";
import { dbService } from "./lib/db";
import { backupService } from "./lib/backupService";

// Components
import MemberProfile from "./components/MemberProfile";
import AIExamScanner from "./components/AIExamScanner";
import RemindersList from "./components/RemindersList";
import BackupManager from "./components/BackupManager";

type MainViewTab = "portfolio" | "scanner" | "reminders";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainViewTab>("portfolio");
  const [showBackup, setShowBackup] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [vitals, setVitals] = useState<HealthVital[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Auto Cloud Sync Detect States
  const [googleAuthState, setGoogleAuthState] = useState<{ user: any; token: string | null }>({ user: null, token: null });
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [driveCheckPending, setDriveCheckPending] = useState(true);
  const [driveBackupToOffer, setDriveBackupToOffer] = useState<{ id: string; name: string; modifiedTime?: string; size?: string } | null>(null);
  const [showDriveOfferModal, setShowDriveOfferModal] = useState(false);
  const [autoRestoreLoading, setAutoRestoreLoading] = useState(false);

  // Auto Backup and Synchronize states
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "failed" | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  // Editing Member State
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAddingNewMember, setIsAddingNewMember] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    relationship: "", 
    birthDate: "", 
    bloodType: "", 
    allergies: "",
    comorbidities: "",
    medications: "",
    avatarUrl: "",
    gender: "F",
    physicalActivity: "",
    familyHistory: "",
  });

  // Load all data from IndexedDB
  const loadClinicalData = async () => {
    try {
      const pMembers = await dbService.getMembers();
      const pConsults = await dbService.getConsultations();
      const pExams = await dbService.getExams();
      const pVitals = await dbService.getVitals();
      const pVaccines = await dbService.getVaccines();

      setMembers(pMembers);
      setConsultations(pConsults);
      setExams(pExams);
      setVitals(pVitals);
      setVaccines(pVaccines);

      if (pMembers.length > 0 && !selectedMemberId) {
        setSelectedMemberId(pMembers[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do prontuário local:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Automatically synchronizes data on application startup.
   */
  const performStartupSync = async (token: string) => {
    setDriveCheckPending(true);
    setSyncStatus("syncing");
    try {
      console.log("[Startup Sync] Verificando backups no Google Drive...");
      const files = await backupService.fetchBackupList(token);
      
      const localLastUpdateStr = dbService.getLocalLastUpdate();
      const localTime = localLastUpdateStr ? new Date(localLastUpdateStr).getTime() : 0;

      if (files.length === 0) {
        console.log("[Startup Sync] Nenhum backup na nuvem. Enviando dados locais atuais automaticamente...");
        await backupService.exportToDrive(token);
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus(null), 8000);
      } else {
        const newestFile = files[0];
        const driveTime = newestFile.modifiedTime ? new Date(newestFile.modifiedTime).getTime() : 0;
        
        console.log(`[Startup Sync] Comparação: Local=${new Date(localTime).toISOString()} | Nuvem=${new Date(driveTime).toISOString()}`);
        
        if (driveTime > localTime + 5000) {
          console.log("[Startup Sync] Nuvem mais recente. Oferecendo restauração...");
          const dismissedId = sessionStorage.getItem(`dismissed_drive_restore_${newestFile.id}`);
          if (!dismissedId) {
            setDriveBackupToOffer(newestFile);
            setShowDriveOfferModal(true);
          }
          setSyncStatus("synced");
        } else if (localTime > driveTime + 5000) {
          console.log("[Startup Sync] Local mais recente. Realizando backup automático em andamento...");
          await backupService.exportToDrive(token);
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus(null), 8000);
        } else {
          console.log("[Startup Sync] Dados perfeitamente sincronizados.");
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus(null), 5000);
        }
      }
    } catch (err: any) {
      console.error("[Startup Sync] Falha catastrófica de sincronização inicial:", err);
      setSyncStatus("failed");
      setSyncError(err.message || String(err));
      if (err.message?.includes("401") || err.message?.toLowerCase().includes("unauthorized") || err.message?.toLowerCase().includes("expirado")) {
        setIsSessionExpired(true);
      }
    } finally {
      setDriveCheckPending(false);
    }
  };

  const handleAutoRestore = async (mode: 'merge' | 'replace') => {
    if (!googleAuthState.token || !driveBackupToOffer) return;
    
    setAutoRestoreLoading(true);
    setSyncStatus("syncing");
    try {
      const backup = await backupService.downloadBackup(googleAuthState.token, driveBackupToOffer.id);
      await backupService.restoreBackupData(backup, mode, driveBackupToOffer.modifiedTime);
      
      alert(
        `Sucesso! Prontuário restaurado com sucesso a partir do Google Drive.\n` +
        `Carregados: ${backup.members?.length || 0} integrante(s), ${backup.consultations?.length || 0} consulta(s), ${backup.exams?.length || 0} exame(s).`
      );
      
      setShowDriveOfferModal(false);
      setDriveBackupToOffer(null);
      setSyncStatus("synced");
      await loadClinicalData();
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err: any) {
      console.error("Erro na autorrestauração:", err);
      setSyncStatus("failed");
      setSyncError(err.message || String(err));
      alert("Falha ao restaurar backup automaticamente: " + (err.message || String(err)));
    } finally {
      setAutoRestoreLoading(false);
    }
  };

  const handleDismissDriveOffer = () => {
    if (driveBackupToOffer) {
      sessionStorage.setItem(`dismissed_drive_restore_${driveBackupToOffer.id}`, "true");
    }
    setShowDriveOfferModal(false);
  };

  const handleMainGoogleSignIn = async () => {
    try {
      setAuthChecking(true);
      const { googleSignIn } = await import("./lib/auth");
      const result = await googleSignIn();
      if (result) {
        setGoogleAuthState({ user: result.user, token: result.accessToken });
        setIsSessionExpired(false);
        await performStartupSync(result.accessToken);
      }
    } catch (err: any) {
      console.error("[Login] Erro no login Google:", err);
      alert("Falha na autenticação do Google: " + (err.message || "Usuário cancelou ou sem conexão."));
    } finally {
      setAuthChecking(false);
    }
  };

  const handleMainGoogleSignOut = async () => {
    try {
      setAuthChecking(true);
      const { logout } = await import("./lib/auth");
      await logout();
      setGoogleAuthState({ user: null, token: null });
      setIsSessionExpired(false);
      setSyncStatus(null);
    } catch (err) {
      console.error("[Logout] Erro de signOut:", err);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    loadClinicalData();
  }, []);

  // Monitor Auth sessions on app startup
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    import("./lib/auth")
      .then(({ initAuth, isTokenExpired }) => {
        const expired = isTokenExpired();
        setIsSessionExpired(expired);
        unsubscribe = initAuth(
          async (user, token) => {
            setGoogleAuthState({ user, token });
            setAuthChecking(false);
            if (expired) {
              setSyncStatus("failed");
              setSyncError("Sessão Google Drive expirou.");
              setDriveCheckPending(false);
              setIsAppInitialized(true);
            } else {
              setIsSessionExpired(false);
              await performStartupSync(token);
              setIsAppInitialized(true);
            }
          },
          () => {
            setGoogleAuthState({ user: null, token: null });
            setIsSessionExpired(false);
            setDriveCheckPending(false);
            setAuthChecking(false);
            setIsAppInitialized(true);
          }
        );
      })
      .catch((err) => {
        console.error("Erro ao iniciar auth listener no App:", err);
        setDriveCheckPending(false);
        setAuthChecking(false);
        setIsAppInitialized(true);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Automatic Background debounced backup monitoring
  useEffect(() => {
    if (!isAppInitialized || isLoading) return;
    if (!googleAuthState.token || isSessionExpired) {
      console.log("[Autobackup] Aguardando conexão Google Drive ou sessão expirada para habilitar backups automáticos...");
      return;
    }

    // Trigger debounced upload 10 seconds after any change
    console.log("[Autobackup] Registros alterados. Iniciando cronômetro de 10s para backup em background.");
    setSyncStatus("syncing");

    const timer = setTimeout(async () => {
      try {
        console.log("[Autobackup] Iniciando backup automático silencioso em segundo plano...");
        await backupService.exportToDrive(googleAuthState.token!);
        console.log("[Autobackup] Backup em background finalizado com absoluto sucesso.");
        setSyncStatus("synced");
        setSyncError(null);
        setTimeout(() => setSyncStatus(current => current === "synced" ? null : current), 5000);
      } catch (err: any) {
        console.error("[Autobackup] Falha no backup automático em segundo plano:", err);
        setSyncStatus("failed");
        setSyncError(err.message || String(err));
        if (err.message?.includes("401") || err.message?.toLowerCase().includes("unauthorized") || err.message?.toLowerCase().includes("expirado")) {
          setIsSessionExpired(true);
        }
      }
    }, 10000); // 10 seconds debounce!

    return () => clearTimeout(timer);
  }, [members, consultations, exams, vitals, vaccines, googleAuthState.token, isSessionExpired, isAppInitialized, isLoading]);

  // Monitor PWA installation prompt lifecycle
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      console.log("[PWA Launcher] beforeinstallprompt disparado pelo navegador. App pronto para instalação.");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log("[PWA Launcher] App instalado com sucesso pelo usuário.");
      setPwaInstalled(true);
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Initial check if running as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("[PWA Launcher] Executando em modo Standalone (App Instalado).");
      setPwaInstalled(true);
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("[PWA Launcher] Botão de instalação acionado mas prompt adiado não está configurado.");
      return;
    }
    console.log("[PWA Launcher] Mostrando diálogo padrão de instalação do navegador...");
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Launcher] Decisão do usuário para instalação: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleAddNewMemberClick = () => {
    setIsAddingNewMember(true);
    setEditForm({
      name: "",
      relationship: "",
      birthDate: "",
      bloodType: "A+",
      allergies: "",
      comorbidities: "",
      medications: "",
      avatarUrl: "",
      gender: "F",
      physicalActivity: "",
      familyHistory: "",
    });
  };

  const handleEditMemberClick = (member: FamilyMember) => {
    setIsAddingNewMember(false);
    setEditingMember(member);
    
    // Auto-infer gender from relationship if not present yet
    let defaultGender = member.gender || "M";
    if (!member.gender) {
      const relLow = (member.relationship || "").toLowerCase();
      const femaleTerms = ["mãe", "mae", "filha", "avó", "avo", "tia", "irmã", "irma", "esposa", "mulher", "prima", "madrasta", "enteada", "gestante", "grávida", "gravida"];
      if (femaleTerms.some(term => relLow.includes(term))) {
        defaultGender = "F";
      }
    }

    setEditForm({
      name: member.name,
      relationship: member.relationship,
      birthDate: member.birthDate,
      bloodType: member.bloodType,
      allergies: member.allergies,
      comorbidities: member.comorbidities || "",
      medications: member.medications || "",
      avatarUrl: member.avatarUrl || "",
      gender: defaultGender,
      physicalActivity: member.physicalActivity || "",
      familyHistory: member.familyHistory || "",
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    if (confirmDeleteId !== memberId) {
      setConfirmDeleteId(memberId);
      return;
    }

    try {
      // 1. Cascade-delete clinical data for this member inside IndexedDB
      const pConsults = await dbService.getConsultations();
      for (const c of pConsults.filter(item => item.memberId === memberId)) {
        await dbService.deleteConsultation(c.id);
      }
      
      const pExams = await dbService.getExams();
      for (const ex of pExams.filter(item => item.memberId === memberId)) {
        await dbService.deleteExam(ex.id);
      }

      const pVitals = await dbService.getVitals();
      for (const vt of pVitals.filter(item => item.memberId === memberId)) {
        await dbService.deleteVital(vt.id);
      }

      const pVaccines = await dbService.getVaccines();
      for (const vc of pVaccines.filter(item => item.memberId === memberId)) {
        await dbService.deleteVaccine(vc.id);
      }

      // 2. Delete the member themselves
      await dbService.deleteMember(memberId);

      setEditingMember(null);
      setConfirmDeleteId(null);
      setIsAddingNewMember(false);
      
      const nextMembers = members.filter(m => m.id !== memberId);
      if (nextMembers.length > 0) {
        setSelectedMemberId(nextMembers[0].id);
      } else {
        setSelectedMemberId("");
      }

      await loadClinicalData();
    } catch (err) {
      console.error("Erro ao excluir integrante:", err);
    }
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingNewMember && !editingMember) return;

    try {
      if (isAddingNewMember) {
        const colors = [
          "bg-blue-600",
          "bg-emerald-500",
          "bg-rose-500",
          "bg-purple-500",
          "bg-indigo-500",
          "bg-orange-550",
          "bg-pink-500",
          "bg-amber-500",
          "bg-red-500"
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newId = "member_" + Date.now();
        const newMember: FamilyMember = {
          id: newId,
          name: editForm.name,
          relationship: editForm.relationship,
          birthDate: editForm.birthDate,
          bloodType: editForm.bloodType || "O+",
          allergies: editForm.allergies || "Nenhuma",
          avatarColor: randomColor,
          comorbidities: editForm.comorbidities,
          medications: editForm.medications,
          avatarUrl: editForm.avatarUrl,
          gender: editForm.gender as "M" | "F",
          physicalActivity: editForm.physicalActivity,
          familyHistory: editForm.familyHistory,
        };

        await dbService.saveMember(newMember);
        setIsAddingNewMember(false);
        setSelectedMemberId(newId);
      } else if (editingMember) {
        const updated: FamilyMember = {
          ...editingMember,
          name: editForm.name,
          relationship: editForm.relationship,
          birthDate: editForm.birthDate,
          bloodType: editForm.bloodType,
          allergies: editForm.allergies,
          comorbidities: editForm.comorbidities,
          medications: editForm.medications,
          avatarUrl: editForm.avatarUrl,
          gender: editForm.gender as "M" | "F",
          physicalActivity: editForm.physicalActivity,
          familyHistory: editForm.familyHistory,
        };

        await dbService.saveMember(updated);
        setEditingMember(null);
      }
      await loadClinicalData();
    } catch (err) {
      console.error("Erro ao salvar dados do membro:", err);
    }
  };

  const activeMember = members.find((m) => m.id === selectedMemberId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        <h3 className="text-slate-800 font-bold text-lg select-none">Iniciando Familink Saúde...</h3>
        <p className="text-sm text-slate-500 mt-1 select-none">Configurando base de dados offline e de alta velocidade.</p>
      </div>
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h3 className="text-slate-800 font-bold text-lg select-none">Verificando sessão Google...</h3>
        <p className="text-sm text-slate-500 mt-1 select-none">Conectando ao canal de backup do Google Drive de forma segura.</p>
      </div>
    );
  }

  if (!googleAuthState.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-xl p-8 border border-slate-150 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
          <div className="relative p-4 bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 rounded-2xl mb-5 flex items-center justify-center shadow-inner">
            <HeartPulse className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
            Bem-vindo ao Familink Saúde
          </h2>
          <p className="text-xs font-black text-blue-600 tracking-wider uppercase block mt-1.5 mb-4">
            Prontuário Médico Familiar Integrado
          </p>

          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-6">
            Para garantir a privacidade absoluta e o backup automático em tempo real do seu prontuário clínico familiar, conecte-se com segurança ao seu <strong>Google Drive</strong>. Seus dados médicos são salvos de forma confidencial em sua própria conta da nuvem.
          </p>

          <div className="w-full space-y-3.5">
            <button
              onClick={handleMainGoogleSignIn}
              id="btn-google-login-start"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Cloud className="w-4.5 h-4.5 animate-bounce" />
              Entrar com o Google para Começar
            </button>
            
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[9px] font-extrabold uppercase tracking-widest pt-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Armazenamento 100% Criptografado & Pessoal
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-800" id="app-root">
      {/* Top Brand Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/60 shadow-xs" id="app-header">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer soft glowing background ring */}
              <div className="absolute inset-0 bg-blue-600/10 rounded-2xl scale-125 blur-xs animate-pulse duration-3000" />
              {/* Inner gradient container */}
              <div className="relative p-1.5 sm:p-2 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl shadow-md border border-white/10 flex items-center justify-center">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-white/95 stroke-[2.2]" />
                {/* Embedded dynamic link/heart sub-dot badge */}
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-gray-900 leading-tight truncate">
                Familink Saúde
              </h1>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-600 tracking-wider uppercase block mt-0.5 truncate">
                {members.length} {members.length === 1 ? "Integrante" : "Integrantes"} • Prontuário IA
              </span>
            </div>
          </div>

          {/* Quick Action elements */}
          <div className="select-none shrink-0 flex items-center gap-1.5 sm:gap-2">
            {/* Sync automatic background status indicator */}
            {syncStatus && (
              <div 
                id="sync-indicator-badge"
                className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 rounded-xl text-[9px] sm:text-[10px] font-extrabold tracking-wide border transition-all animate-in fade-in duration-150 ${
                  syncStatus === "syncing"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : syncStatus === "synced"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-250 animate-pulse"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
                title={syncError || undefined}
              >
                {syncStatus === "syncing" && <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />}
                {syncStatus === "synced" && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                {syncStatus === "failed" && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                
                <span className="hidden sm:inline">
                  {syncStatus === "syncing" && "Sincronizando..."}
                  {syncStatus === "synced" && "Sincronizado"}
                  {syncStatus === "failed" && "Sincronização Falhou"}
                </span>
                <span className="sm:hidden">
                  {syncStatus === "syncing" && "Sinc..."}
                  {syncStatus === "synced" && "Sincronizado"}
                  {syncStatus === "failed" && "Falhou..."}
                </span>
              </div>
            )}

            {showInstallBtn && (
              <button
                type="button"
                id="btn-install-pwa"
                onClick={handleInstallClick}
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border border-emerald-500 rounded-xl text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 hover:brightness-105"
              >
                <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}
            
            {isSessionExpired && (
              <button
                type="button"
                id="btn-reconnect-google-drive"
                onClick={handleMainGoogleSignIn}
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold border border-amber-400 rounded-xl text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 animate-pulse"
                title="Sua sessão expirou devido ao limite de tempo do Google Drive. Clique aqui para reconectar em 1 segundo!"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Reconectar</span>
              </button>
            )}

            <button
              type="button"
              id="btn-open-backup"
              onClick={() => setShowBackup(true)}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold border border-blue-200 rounded-xl text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Nuvem</span>
              <span className="sm:hidden">Backup</span>
            </button>

            {googleAuthState.user && (
              <button
                type="button"
                id="btn-google-logout"
                onClick={handleMainGoogleSignOut}
                className="p-1 sm:p-1.5 bg-slate-50 hover:bg-red-50 text-gray-500 hover:text-red-650 rounded-xl hover:border-red-150 border border-slate-200 transition-all cursor-pointer"
                title="Sair da Conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global tab Switcher navigation bar */}
        <div className="max-w-5xl mx-auto border-t border-slate-100 bg-white shadow-3xs" id="main-navigation">
          <div className="grid grid-cols-3 w-full bg-white px-1 sm:px-4">
            {(["portfolio", "scanner", "reminders"] as MainViewTab[]).map((tab) => {
              const isSelected = activeTab === tab;
              const labels = {
                portfolio: (
                  <>
                    <span className="hidden sm:inline">Prontuário Individual</span>
                    <span className="sm:hidden">Prontuário</span>
                  </>
                ),
                scanner: (
                  <>
                    <span className="hidden sm:inline">SmartScan™ IA</span>
                    <span className="sm:hidden">SmartScan IA</span>
                  </>
                ),
                reminders: (
                  <>
                    <span className="hidden sm:inline">Vacinas & Lembretes</span>
                    <span className="sm:hidden">Lembretes</span>
                  </>
                )
              };
              const Icons = {
                portfolio: Users,
                scanner: BrainCircuit,
                reminders: Bell
              };
              const Icon = Icons[tab];

              return (
                <button
                  key={tab}
                  type="button"
                  className={`py-3 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm font-bold tracking-wide border-b-3 transition-colors cursor-pointer shrink-0 ${
                    isSelected 
                      ? "border-blue-600 text-blue-600 font-black bg-blue-50/5" 
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                  <span className="truncate max-w-full leading-none">{labels[tab]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main viewport Container */}
      <main className="max-w-5xl mx-auto px-4 mt-6">
        
        {/* TAB 1: Individual medical profile portfolios */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            
            {/* Horizontal Family member row chooser */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-5" id="member-scroller">
              <div className="flex items-center justify-between mb-3 text-left">
                <span className="text-2xs font-extrabold text-gray-400 uppercase tracking-widest block font-bold select-none">
                  Escolha o Integrante da Família
                </span>
                
                {activeMember && (
                  <button
                    type="button"
                    onClick={() => handleEditMemberClick(activeMember)}
                    className="text-[9px] text-blue-600 font-extrabold hover:text-blue-800 flex items-center gap-0.5 cursor-pointer bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-1.5 py-0.5 rounded-md transition-transform"
                    id="btn-edit-member"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    Editar Perfil
                  </button>
                )}
              </div>

              {/* Members horizontal slider container */}
              <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-200" id="members-horizontal-list">
                {members.map((member) => {
                  const isSelected = member.id === selectedMemberId;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`flex-none flex items-center gap-3 py-3 px-4 rounded-xl border transition-all text-left cursor-pointer ${
                        isSelected 
                          ? "border-blue-600 bg-blue-50/20 ring-1 ring-blue-600/50 shadow-3xs" 
                          : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      {/* Circle avatar badge */}
                      {member.avatarUrl ? (
                        <img 
                          src={member.avatarUrl} 
                          alt={member.name} 
                          className="w-10 h-10 rounded-lg object-cover shadow-3xs"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${member.avatarColor} text-white font-extrabold flex items-center justify-center shadow-3xs uppercase tracking-wide`}>
                          {(member.name || member.relationship).substring(0, 2)}
                        </div>
                      )}
                      
                      <div className="min-w-[80px]">
                        <h4 className="font-bold text-gray-900 text-xs truncate leading-snug">{member.name || "Sem Nome"}</h4>
                        <span className="text-3xs font-semibold text-gray-500 uppercase tracking-wider block mt-0.5">{member.relationship}</span>
                      </div>
                    </button>
                  );
                })}

                {/* Add member button inside carousel */}
                <button
                  type="button"
                  onClick={handleAddNewMemberClick}
                  className="flex-none flex items-center gap-3 py-3 px-4 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/20 hover:text-blue-600 text-gray-500 font-extrabold transition-all text-left cursor-pointer"
                  id="btn-add-new-member-carousel"
                >
                  <div className="w-10 h-10 rounded-lg border border-dashed border-gray-300 hover:border-blue-300 flex items-center justify-center bg-gray-50/10 shadow-3xs shrink-0 select-none">
                    <Plus className="w-5 h-5 text-gray-405 group-hover:text-blue-500" />
                  </div>
                  <div className="min-w-[80px]">
                    <h4 className="font-semibold text-xs leading-snug">Novo Membro</h4>
                    <span className="text-3xs font-semibold uppercase tracking-wider block mt-0.5 text-blue-600">Cadastrar</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Render active selected Member Profile Ledger */}
            {activeMember ? (
              <MemberProfile
                member={activeMember}
                consultations={consultations}
                exams={exams}
                vitals={vitals}
                vaccines={vaccines}
                onDataChanged={loadClinicalData}
              />
            ) : (
              <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                <Users className="w-12 h-12 text-gray-300 mb-2 shrink-0" />
                <p className="font-bold text-gray-700 max-w-sm mb-4">Selecione ou cadastre um integrante para visualizar seu histórico de prontuários.</p>
                <button
                  type="button"
                  onClick={handleAddNewMemberClick}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Integrante
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI exam scanner portal */}
        {activeTab === "scanner" && (
          <AIExamScanner 
            members={members} 
            onExamSaved={loadClinicalData} 
          />
        )}

        {/* TAB 3: Global reminders & auto alert ledger */}
        {activeTab === "reminders" && (
          <RemindersList 
            members={members} 
            consultations={consultations} 
            vaccines={vaccines} 
          />
        )}
      </main>

      {/* Edit/Add Member Profile Modal Dialog */}
      {(editingMember || isAddingNewMember) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-sm w-full max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl p-5 sm:p-6 text-left overflow-hidden">
            <button
              type="button"
              className="absolute right-4 top-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors cursor-pointer animate-in fade-in zoom-in-95"
              onClick={() => {
                setEditingMember(null);
                setIsAddingNewMember(false);
                setConfirmDeleteId(null);
              }}
            >
              <X className="w-4 h-4 shadow-3xs" />
            </button>

            <h3 className="font-extrabold text-gray-900 text-lg mb-4 inline-flex items-center gap-2 shrink-0 select-none">
              {isAddingNewMember ? (
                <>
                  <Plus className="w-5 h-5 text-emerald-500" />
                  Cadastrar Integrante
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 text-blue-500" />
                  Editar Dados de Saúde
                </>
              )}
            </h3>

            <form onSubmit={handleEditMemberSubmit} className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
              {/* Foto de Perfil */}
              <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 select-none">Foto de Perfil</label>
                <div className="relative group">
                  {editForm.avatarUrl ? (
                    <img 
                      src={editForm.avatarUrl} 
                      alt="Foto de perfil" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-slate-250 text-slate-600 border-4 border-white shadow-md text-2xl font-black">
                      {editForm.name ? editForm.name.slice(0, 2).toUpperCase() : <Users className="w-8 h-8 text-slate-400" />}
                    </div>
                  )}
                  
                  <label htmlFor="member-profile-photo-upload" className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-95">
                    <Edit3 className="w-4 h-4" />
                    <input 
                      id="member-profile-photo-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {editForm.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, avatarUrl: "" }))}
                    className="text-2xs text-rose-600 font-bold hover:underline mt-2 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remover Foto
                  </button>
                )}
                <p className="text-[10px] text-slate-400 mt-2 text-center select-none font-medium">JPEG ou PNG. Redimensionado para o círculo.</p>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva..."
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 font-semibold text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Parentesco</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Filho, Mãe, Tio..."
                    value={editForm.relationship}
                    onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={editForm.birthDate}
                    onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Sexo Biológico</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-105 text-gray-800 font-semibold"
                  >
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Tipo Sanguíneo</label>
                  <select
                    value={editForm.bloodType}
                    onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Não Sei"].map((blood) => (
                      <option key={blood} value={blood}>
                        {blood}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Alergias</label>
                <input
                  type="text"
                  placeholder="Ex: Nenhuma, Dipirona..."
                  value={editForm.allergies}
                  onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Comorbidades</label>
                  <input
                    type="text"
                    placeholder="Ex: Asma, Hipertensão..."
                    value={editForm.comorbidities}
                    onChange={(e) => setEditForm({ ...editForm, comorbidities: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Medicamentos em Uso</label>
                  <input
                    type="text"
                    placeholder="Ex: Symbicort, Sertralina..."
                    value={editForm.medications}
                    onChange={(e) => setEditForm({ ...editForm, medications: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Atividade Física Regular</label>
                  <input
                    type="text"
                    placeholder="Ex: Musculação 3x/semana, Corrida, Sedentário..."
                    value={editForm.physicalActivity}
                    onChange={(e) => setEditForm({ ...editForm, physicalActivity: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">Antecedentes Familiares</label>
                  <input
                    type="text"
                    placeholder="Ex: Hipertensão (pai), Diabetes (avó)..."
                    value={editForm.familyHistory}
                    onChange={(e) => setEditForm({ ...editForm, familyHistory: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-100 text-gray-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 justify-between items-center">
                {!isAddingNewMember && editingMember && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(editingMember.id)}
                    className={`py-2 px-3 rounded-xl text-[10px] font-extrabold transition-all duration-150 flex items-center gap-1 cursor-pointer active:scale-95 shrink-0 select-none ${
                      confirmDeleteId === editingMember.id
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmDeleteId === editingMember.id ? "Confirmar?" : "Excluir"}
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    type="submit"
                    id="btn-save-member-edit"
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isAddingNewMember ? "Adicionar" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMember(null);
                      setIsAddingNewMember(false);
                      setConfirmDeleteId(null);
                    }}
                    className="py-2 px-4 bg-white text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Automatic Restore Alert Overlay */}
      {showDriveOfferModal && driveBackupToOffer && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 text-left border border-blue-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              className="absolute right-4 top-4 p-2 bg-gray-50 hover:bg-gray-150 text-gray-500 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
              onClick={handleDismissDriveOffer}
              disabled={autoRestoreLoading}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-gray-950 text-base leading-tight">
                  Backup mais recente na Nuvem!
                </h3>
                <span className="text-[10px] text-blue-600 font-extrabold tracking-wider uppercase block mt-0.5">
                  Sincronização em Nuvem Detectada
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-medium leading-relaxed mb-4">
              Encontramos um arquivo de prontuário clínico salvo no seu Google Drive com atualizações mais recentes do que as informações salvas localmente neste navegador.
            </p>

            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3.5 space-y-2 mb-4 text-xs font-semibold text-gray-700">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-gray-450 font-black">
                <span>Navegador Local</span>
                <span>Google Drive (Nuvem)</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="border-r border-gray-200 pr-2">
                  <p className="font-extrabold text-gray-900 leading-tight text-xs">Instalação Atual</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {(() => {
                      const localVal = dbService.getLocalLastUpdate();
                      return localVal 
                        ? new Date(localVal).toLocaleString("pt-BR") 
                        : "Sem alterações registradas";
                    })()}
                  </p>
                </div>
                <div className="pl-2">
                  <p className="font-extrabold text-blue-900 leading-tight text-xs truncate animate-pulse" title={driveBackupToOffer.name}>
                    {driveBackupToOffer.name}
                  </p>
                  <p className="text-[10px] text-blue-700 mt-1">
                    {driveBackupToOffer.modifiedTime 
                      ? new Date(driveBackupToOffer.modifiedTime).toLocaleString("pt-BR") 
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={autoRestoreLoading}
                  onClick={() => handleAutoRestore("replace")}
                  className="flex-1 py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98"
                >
                  {autoRestoreLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Limpar & Substituir
                </button>
                <button
                  type="button"
                  disabled={autoRestoreLoading}
                  onClick={() => handleAutoRestore("merge")}
                  className="flex-1 py-2.5 px-3.5 bg-sky-50 hover:bg-sky-100 disabled:bg-slate-35 border border-sky-150 text-sky-800 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  Mesclar com Local
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={autoRestoreLoading}
                  onClick={handleDismissDriveOffer}
                  className="w-full py-2 bg-white hover:bg-gray-50 text-gray-500 border border-gray-250/55 hover:text-gray-700 text-center font-bold text-[9px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Ignorar e Manter Dados Locais
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup and Restore Manager Dialog Modal overlay */}
      <BackupManager 
        isOpen={showBackup} 
        onClose={() => setShowBackup(false)} 
        onDataImported={loadClinicalData} 
      />
    </div>
  );
}

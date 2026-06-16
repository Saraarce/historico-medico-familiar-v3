import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { FamilyMember, Consultation, Exam, HealthVital, Vaccine } from "../types";
import { 
  Heart, Calendar, Syringe, Clipboard, Plus, Save, Trash2, 
  User, Check, X, Camera, Eye, AlertCircle, FileText, Info,
  Download, ExternalLink, Sparkles, Edit3, Activity, HeartPulse,
  FileSpreadsheet, Beaker, Image, Scale, Ruler, Dumbbell, Users, Hospital
} from "lucide-react";
import HealthTrendsChart from "./HealthTrendsChart";
import SpreadsheetImporter from "./SpreadsheetImporter";

interface MemberProfileProps {
  member: FamilyMember;
  consultations: Consultation[];
  exams: Exam[];
  vitals: HealthVital[];
  vaccines: Vaccine[];
  onDataChanged: () => void;
}

type ProfileTab = "summary" | "consultations" | "surgeries" | "hospitalizations" | "exams" | "vaccines";

export interface VaccineRecommendation {
  id: string;
  name: string;
  dose: string;
  targetAgeText: string;
  ageMinInMonths: number;
  ageMaxInMonths: number;
  observations: string;
  keywords: string[];
  group: "children" | "adults" | "gestantes" | "elderly";
  rigidLimitDays?: number;
}

const RECOMMENDED_VACCINES: VaccineRecommendation[] = [
  // COORTE INFANTIL / ADOLESCENTE (0 a 24 Anos)
  {
    id: "child_bcg",
    name: "BCG",
    dose: "Dose Única",
    targetAgeText: "Ao nascer",
    ageMinInMonths: 0,
    ageMaxInMonths: 1,
    observations: "Protege contra formas graves de tuberculose (como meníngea e militar) e hanseníase.",
    keywords: ["bcg", "tuberculose"],
    group: "children"
  },
  {
    id: "child_hepb_birth",
    name: "Hepatite B",
    dose: "1ª Dose",
    targetAgeText: "Ao nascer",
    ageMinInMonths: 0,
    ageMaxInMonths: 1,
    observations: "Prevenção da transmissão vertical e infecção crônica por Hepatite B.",
    keywords: ["hepatite b", "hep b", "hepb"],
    group: "children"
  },
  {
    id: "child_penta_1",
    name: "Penta (DTP+Hib+HB)",
    dose: "1ª Dose",
    targetAgeText: "2 meses",
    ageMinInMonths: 2,
    ageMaxInMonths: 3,
    observations: "Protege contra Difteria, Tétano, Coqueluche, Hepatite B e infecções graves por Haemophilus influenzae b.",
    keywords: ["penta", "pentavalente", "dtp+hib+hb"],
    group: "children"
  },
  {
    id: "child_penta_2",
    name: "Penta (DTP+Hib+HB)",
    dose: "2ª Dose",
    targetAgeText: "4 meses",
    ageMinInMonths: 4,
    ageMaxInMonths: 5,
    observations: "Segunda dose da vacina Pentavalente.",
    keywords: ["penta", "pentavalente", "dtp+hib+hb"],
    group: "children"
  },
  {
    id: "child_penta_3",
    name: "Penta (DTP+Hib+HB)",
    dose: "3ª Dose",
    targetAgeText: "6 meses",
    ageMinInMonths: 6,
    ageMaxInMonths: 7,
    observations: "Terceira dose da vacina Pentavalente.",
    keywords: ["penta", "pentavalente", "dtp+hib+hb"],
    group: "children"
  },
  {
    id: "child_polio_1",
    name: "Poliomielite (VIP)",
    dose: "1ª Dose",
    targetAgeText: "2 meses",
    ageMinInMonths: 2,
    ageMaxInMonths: 3,
    observations: "Vacina Inativada Poliomielite (VIP). Protege contra a paralisia infantil.",
    keywords: ["vip", "poliomielite", "polio", "paralisia"],
    group: "children"
  },
  {
    id: "child_polio_2",
    name: "Poliomielite (VIP)",
    dose: "2ª Dose",
    targetAgeText: "4 meses",
    ageMinInMonths: 4,
    ageMaxInMonths: 5,
    observations: "Segunda dose contra a paralisia infantil (VIP).",
    keywords: ["vip", "poliomielite", "polio", "paralisia"],
    group: "children"
  },
  {
    id: "child_polio_3",
    name: "Poliomielite (VIP)",
    dose: "3ª Dose",
    targetAgeText: "6 meses",
    ageMinInMonths: 6,
    ageMaxInMonths: 7,
    observations: "Terceira dose contra a paralisia infantil (VIP).",
    keywords: ["vip", "poliomielite", "polio", "paralisia"],
    group: "children"
  },
  {
    id: "child_polio_ref",
    name: "Poliomielite (VIP)",
    dose: "Reforço",
    targetAgeText: "15 meses",
    ageMinInMonths: 15,
    ageMaxInMonths: 18,
    observations: "Dose de reforço contra paralisia infantil (VIP).",
    keywords: ["vip", "poliomielite", "polio", "paralisia", "reforço polio", "reforco polio"],
    group: "children"
  },
  {
    id: "child_pneumo_1",
    name: "Pneumocócica 10-V",
    dose: "1ª Dose",
    targetAgeText: "3 meses",
    ageMinInMonths: 3,
    ageMaxInMonths: 4,
    observations: "Protege contra pneumonia, otite média aguda, sinusite e meningites causadas pelo pneumococo.",
    keywords: ["pneumococica", "pneumo", "pneumo 10", "10-v"],
    group: "children"
  },
  {
    id: "child_pneumo_2",
    name: "Pneumocócica 10-V",
    dose: "2ª Dose",
    targetAgeText: "4 meses",
    ageMinInMonths: 4,
    ageMaxInMonths: 5,
    observations: "Segunda dose contra infecções pneumocócicas.",
    keywords: ["pneumococica", "pneumo", "pneumo 10", "10-v"],
    group: "children"
  },
  {
    id: "child_pneumo_ref",
    name: "Pneumocócica 10-V",
    dose: "Reforço",
    targetAgeText: "12 meses",
    ageMinInMonths: 12,
    ageMaxInMonths: 14,
    observations: "Reforço contra infecções pneumocócicas aos 12 meses.",
    keywords: ["pneumococica", "pneumo", "pneumo 10", "10-v"],
    group: "children"
  },
  {
    id: "child_rotavirus_1",
    name: "Rotavírus Humano",
    dose: "1ª Dose",
    targetAgeText: "3 meses",
    ageMinInMonths: 3,
    ageMaxInMonths: 11,
    rigidLimitDays: 364,
    observations: "Protege contra diarreia severa e desidratação por rotavírus. Limites rígidos: D1 deve ser tomada até os 11 meses e 29 dias.",
    keywords: ["rotavirus", "rota virus", "rotavírus"],
    group: "children"
  },
  {
    id: "child_rotavirus_2",
    name: "Rotavírus Humano",
    dose: "2ª Dose",
    targetAgeText: "4 meses",
    ageMinInMonths: 4,
    ageMaxInMonths: 23,
    rigidLimitDays: 729,
    observations: "Segunda dose contra gastroenterite. Limites rígidos: D2 deve ser tomada até os 23 meses e 29 dias.",
    keywords: ["rotavirus", "rota virus", "rotavírus"],
    group: "children"
  },
  {
    id: "child_meningoc_1",
    name: "Meningocócica C",
    dose: "1ª Dose",
    targetAgeText: "3 meses",
    ageMinInMonths: 3,
    ageMaxInMonths: 4,
    observations: "Previne da doença meningocócica invasiva causada pelo Neisseria meningitidis do sorogrupo C.",
    keywords: ["meningococica c", "meningo c", "meningocócica c"],
    group: "children"
  },
  {
    id: "child_meningoc_2",
    name: "Meningocócica C",
    dose: "2ª Dose",
    targetAgeText: "5 meses",
    ageMinInMonths: 5,
    ageMaxInMonths: 6,
    observations: "Segunda dose da imunização contra Meningite C.",
    keywords: ["meningococica c", "meningo c", "meningocócica c"],
    group: "children"
  },
  {
    id: "child_meningoacwy_12",
    name: "Meningocócica ACWY",
    dose: "1ª Dose",
    targetAgeText: "12 meses",
    ageMinInMonths: 12,
    ageMaxInMonths: 15,
    observations: "Protege contra meningites causadas pelos quatro sorogrupos da bactéria meningococo (A, C, W e Y).",
    keywords: ["meningococica acwy", "meningo acwy", "meningocócica acwy"],
    group: "children"
  },
  {
    id: "child_triplice_1",
    name: "Tríplice Viral (SCR)",
    dose: "1ª Dose",
    targetAgeText: "12 meses",
    ageMinInMonths: 12,
    ageMaxInMonths: 14,
    observations: "Protege contra Sarampo, Caxumba e Rubéola.",
    keywords: ["triplice viral", "scr", "sarampo caxumba rubeola", "tríplice viral"],
    group: "children"
  },
  {
    id: "child_triplice_2",
    name: "Tríplice Viral (SCR)",
    dose: "2ª Dose",
    targetAgeText: "15 meses",
    ageMinInMonths: 15,
    ageMaxInMonths: 18,
    observations: "Segunda dose para consolidar imunidade duradoura contra Sarampo, Caxumba e Rubéola.",
    keywords: ["triplice viral", "scr", "sarampo caxumba rubeola", "tríplice viral"],
    group: "children"
  },
  {
    id: "child_dtp_ref1",
    name: "DTP",
    dose: "1º Reforço",
    targetAgeText: "15 meses",
    ageMinInMonths: 15,
    ageMaxInMonths: 18,
    observations: "Reforço contra Difteria, Tétano e Coqueluche aos 15 meses.",
    keywords: ["dtp", "triplice bacteriana", "tríplice bacteriana"],
    group: "children"
  },
  {
    id: "child_dtp_ref2",
    name: "DTP",
    dose: "2º Reforço",
    targetAgeText: "4 anos",
    ageMinInMonths: 48,
    ageMaxInMonths: 60,
    observations: "Segundo e último reforço padrão na infância contra Difteria, Tétano e Coqueluche aos 4 anos.",
    keywords: ["dtp", "triplice bacteriana", "tríplice bacteriana"],
    group: "children"
  },
  {
    id: "child_hepa",
    name: "Hepatite A",
    dose: "Dose Única",
    targetAgeText: "15 meses",
    ageMinInMonths: 15,
    ageMaxInMonths: 18,
    observations: "Protege contra inflamações graves do fígado provocadas pelo vírus da Hepatite A.",
    keywords: ["hepatite a", "hep a", "hepa"],
    group: "children"
  },
  {
    id: "child_varicela_1",
    name: "Varicela",
    dose: "1ª Dose",
    targetAgeText: "15 meses",
    ageMinInMonths: 15,
    ageMaxInMonths: 18,
    observations: "Proteção contra catapora avançada ou severa.",
    keywords: ["varicela", "catapora"],
    group: "children"
  },
  {
    id: "child_varicela_2",
    name: "Varicela",
    dose: "2ª Dose",
    targetAgeText: "4 anos",
    ageMinInMonths: 48,
    ageMaxInMonths: 60,
    observations: "Consolidação da proteção contra catapora (Varicela).",
    keywords: ["varicela", "catapora"],
    group: "children"
  },
  {
    id: "child_amarela_1",
    name: "Febre Amarela",
    dose: "1ª Dose",
    targetAgeText: "9 meses",
    ageMinInMonths: 9,
    ageMaxInMonths: 11,
    observations: "Prevenção universal da Febre Amarela. Pode ser administrada preventivamente de 6 a 8 meses em áreas de alto risco circulatório.",
    keywords: ["febre amarela", "amarela"],
    group: "children"
  },
  {
    id: "child_amarela_ref",
    name: "Febre Amarela",
    dose: "Reforço",
    targetAgeText: "4 anos",
    ageMinInMonths: 48,
    ageMaxInMonths: 60,
    observations: "Reforço contra febre amarela aos 4 anos.",
    keywords: ["febre amarela", "amarela"],
    group: "children"
  },
  {
    id: "child_influenza",
    name: "Influenza Trivalente",
    dose: "Dose Anual",
    targetAgeText: "Anual (6 meses a menores de 6 anos)",
    ageMinInMonths: 6,
    ageMaxInMonths: 71,
    observations: "Protege contra o vírus sazonal da gripe e complicações. Primeira aplicação exige 2 doses com diferença de 30 dias.",
    keywords: ["influenza", "gripe", "gripe trivalente"],
    group: "children"
  },
  {
    id: "child_covid",
    name: "Covid-19",
    dose: "Dose do Esquema",
    targetAgeText: "Iniciando aos 6 meses",
    ageMinInMonths: 6,
    ageMaxInMonths: 216,
    observations: "Esquema inicial de 2 doses (Spikevax / Moderna) ou de 3 doses (Comirnaty / Pfizer) iniciando aos 6 meses contra complicações virais.",
    keywords: ["covid", "covid-19", "coronavirus"],
    group: "children"
  },
  {
    id: "child_hpv",
    name: "HPV4",
    dose: "Dose Única",
    targetAgeText: "9 aos 14 anos",
    ageMinInMonths: 108,
    ageMaxInMonths: 180,
    observations: "Dose única dos 9 aos 14 anos contra o Papilomavírus Humano. Disponível como resgate em dose única até 19 anos se sem histórico vacinal.",
    keywords: ["hpv", "hpv4", "papilomavir", "papilomavírus"],
    group: "children"
  },
  {
    id: "child_dengue",
    name: "Dengue Tetravalente",
    dose: "Esquema de 2 doses",
    targetAgeText: "10 aos 14 anos",
    ageMinInMonths: 120,
    ageMaxInMonths: 180,
    observations: "Esquema de duas doses contra a Dengue. Se teve diagnóstico recente de dengue, recomenda-se adiar por 6 meses o começo do esquema.",
    keywords: ["dengue", "qdenga"],
    group: "children"
  },
  {
    id: "child_meningoacwy_teen",
    name: "Meningocócica ACWY",
    dose: "Reforço / Dose Única",
    targetAgeText: "11 aos 14 anos",
    ageMinInMonths: 132,
    ageMaxInMonths: 180,
    observations: "Disponibilizada no SUS para adolescentes de 11 a 14 anos para garantir proteção circulante contra meningococo.",
    keywords: ["meningococica acwy", "meningo acwy", "meningocócica acwy"],
    group: "children"
  },
  {
    id: "child_triplice_teen",
    name: "Tríplice Viral (SCR)",
    dose: "Resgate / Esquema",
    targetAgeText: "10 aos 24 anos",
    ageMinInMonths: 120,
    ageMaxInMonths: 300,
    observations: "Garantir 2 doses completas na vida adulta de 10 a 24 anos caso o histórico de infância esteja incompleto.",
    keywords: ["triplice viral", "scr", "sarampo caxumba rubeola", "tríplice viral"],
    group: "children"
  },

  // ADULTOS E IDOSOS (25 Anos ou Mais)
  {
    id: "adult_hepb",
    name: "Hepatite B",
    dose: "Esquema (3 Doses)",
    targetAgeText: "A partir de 25 anos",
    ageMinInMonths: 300,
    ageMaxInMonths: 1500,
    observations: "Esquema corretivo ou inicial de 3 doses para todas as idades conforme histórico vacinal.",
    keywords: ["hepatite b", "hep b", "hepb"],
    group: "adults"
  },
  {
    id: "adult_dt",
    name: "dT (Difteria e Tétano)",
    dose: "Reforço a cada 10 anos",
    targetAgeText: "A partir de 25 anos",
    ageMinInMonths: 300,
    ageMaxInMonths: 1500,
    observations: "Três doses básicas ou reforço obrigatório a cada 10 anos (ou 5 anos em caso de ferimentos cirúrgicos de risco).",
    keywords: ["dt (", "dupla adulto", "difteria e tetano", "difteria tétano", "dupla tipo adulto"],
    group: "adults"
  },
  {
    id: "adult_triplice_young",
    name: "Tríplice Viral (SCR)",
    dose: "Esquema (Até 2 Doses)",
    targetAgeText: "25 a 29 anos",
    ageMinInMonths: 300,
    ageMaxInMonths: 359,
    observations: "Adultos de 25 a 29 anos: Certificar totalização de até 2 doses no arquivo histórico do SUS.",
    keywords: ["triplice viral", "scr", "sarampo caxumba rubeola", "tríplice viral"],
    group: "adults"
  },
  {
    id: "adult_triplice_mid",
    name: "Tríplice Viral (SCR)",
    dose: "1 Dose corretiva",
    targetAgeText: "30 a 59 anos",
    ageMinInMonths: 360,
    ageMaxInMonths: 719,
    observations: "De 30 a 59 anos: Exige-se o registro de pelo menos uma dose de SCR no histórico.",
    keywords: ["triplice viral", "scr", "sarampo caxumba rubeola", "tríplice viral"],
    group: "adults"
  },
  {
    id: "adult_amarela",
    name: "Febre Amarela",
    dose: "Dose Única",
    targetAgeText: "Adultos (Até 59 anos)",
    ageMinInMonths: 300,
    ageMaxInMonths: 719,
    observations: "Dose única para adultos até 59 anos se nunca tomou. Para idosos 60+, sob avaliação estrita de risco-benefício.",
    keywords: ["febre amarela", "amarela"],
    group: "adults"
  },
  {
    id: "elderly_influenza",
    name: "Influenza Trivalente",
    dose: "Dose Anual",
    targetAgeText: "Anual (60 anos ou mais)",
    ageMinInMonths: 720,
    ageMaxInMonths: 1500,
    observations: "Dose anual sazonal do vírus Influenza extremamente recomendada para a melhor idade (60+).",
    keywords: ["influenza", "gripe", "gripe trivalente"],
    group: "elderly"
  },
  {
    id: "elderly_covid",
    name: "Covid-19 (Reforço)",
    dose: "Dose Semestral",
    targetAgeText: "Semestral (60 anos ou mais)",
    ageMinInMonths: 720,
    ageMaxInMonths: 1500,
    observations: "Dose de reforço semestral recomendada e incentivada para idosos devido ao perfil imunitário e variantes.",
    keywords: ["covid", "covid-19", "coronavirus"],
    group: "elderly"
  },

  // CATCH-ALL ADICIONAL GESTANTE (Ativa-se caso toggle isPregnant esteja verdadeiro)
  {
    id: "gestante_dtpa",
    name: "dTpa (Tríplice Bacteriana Acelular)",
    dose: "1 Dose a cada gestação",
    targetAgeText: "A partir de 20 semanas",
    ageMinInMonths: 144, // 12+ years
    ageMaxInMonths: 1500,
    observations: "Aplicada a partir da 20ª semana gestacional para transferir anticorpos da coqueluche e do tétano para o recém-nascido. Obrigatório em cada gestação.",
    keywords: ["dtpa", "dtp acelerada", "triple bacteriana acelerada", "triplice bacteriana acelular", "tríplice bacteriana acelular"],
    group: "gestantes"
  },
  {
    id: "gestante_vvsr",
    name: "Vírus Sincicial Respiratório (VVSR)",
    dose: "1 Dose a cada gestação",
    targetAgeText: "Entre 28 e 36 semanas",
    ageMinInMonths: 144,
    ageMaxInMonths: 1500,
    observations: "Aplicada entre a 28ª e 36ª semana. Transfere anticorpos para proteger o bebê nos primeiros 6 meses de vida contra bronquiolites e pneumonia pelo VSR.",
    keywords: ["virus sincicial", "vvsr", "sincicial", "vírus sincicial"],
    group: "gestantes"
  },
  {
    id: "gestante_influenza",
    name: "Influenza Trivalente (Gestante)",
    dose: "1 Dose por gestação",
    targetAgeText: "Temporada Gestacional",
    ageMinInMonths: 144,
    ageMaxInMonths: 1500,
    observations: "Garante imunidade para a gestante e anticorpos iniciais para o feto contra o vírus sazonal da gripe.",
    keywords: ["influenza", "gripe", "gripe trivalente"],
    group: "gestantes"
  },
  {
    id: "gestante_covid",
    name: "Covid-19 (Gestante)",
    dose: "1 Dose a cada gestação",
    targetAgeText: "Na gestação",
    ageMinInMonths: 144,
    ageMaxInMonths: 1500,
    observations: "Dose de reforço adaptativa para maior segurança e imunidade materna e neonatal.",
    keywords: ["covid", "covid-19", "coronavirus"],
    group: "gestantes"
  }
];

// Helper to convert varied date formats (YYYY-MM-DD or DD/MM/YYYY) into numerical timestamp for reliable sorting
function parseDateToTime(dateStr: string): number {
  if (!dateStr || typeof dateStr !== "string") return 0;
  
  const trimmed = dateStr.trim();
  
  // Try format YYYY-MM-DD
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  
  // Try format DD/MM/YYYY
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  
  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? 0 : parsed;
}

export default function MemberProfile({ 
  member, consultations, exams, vitals, vaccines, onDataChanged 
}: MemberProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("summary");
  
  // Forms states
  const [showAddVital, setShowAddVital] = useState(false);
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSpreadsheetImport, setShowSpreadsheetImport] = useState(false);
  const [editingVital, setEditingVital] = useState<HealthVital | null>(null);
  const [editVitalForm, setEditVitalForm] = useState({ date: "", weight: "", sys: "", dia: "", glucose: "", hr: "", height: "" });
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [editConsultForm, setEditConsultForm] = useState({ date: "", specialty: "", doctor: "", facility: "", reason: "", prescription: "", notes: "" });
  const [editingSurgery, setEditingSurgery] = useState<Consultation | null>(null);
  const [editSurgeryForm, setEditSurgeryForm] = useState({ date: "", title: "", specialty: "", doctor: "", facility: "", prescription: "", notes: "" });
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editExamForm, setEditExamForm] = useState({ date: "", title: "", category: "", facility: "", doctor: "", observations: "" });
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [editVaccineForm, setEditVaccineForm] = useState({ name: "", dose: "", status: "applied", dueDate: "", appliedDate: "", batch: "" });
  const [showAddHospitalization, setShowAddHospitalization] = useState(false);
  const [editingHospitalization, setEditingHospitalization] = useState<Consultation | null>(null);
  const [editHospitalForm, setEditHospitalForm] = useState({ date: "", dischargeDate: "", facility: "", reason: "", diagnosis: "", doctor: "", prescription: "", notes: "" });

  // Form Fields
  const [vitalForm, setVitalForm] = useState({ date: new Date().toISOString().split("T")[0], weight: "", sys: "", dia: "", glucose: "", hr: "", height: "" });
  const [consultForm, setConsultForm] = useState({ date: new Date().toISOString().split("T")[0], specialty: "", doctor: "", facility: "", reason: "", prescription: "", notes: "" });
  const [surgeryForm, setSurgeryForm] = useState({ date: new Date().toISOString().split("T")[0], title: "", specialty: "", doctor: "", facility: "", prescription: "", notes: "" });
  const [examForm, setExamForm] = useState({ date: new Date().toISOString().split("T")[0], title: "", category: "", facility: "", doctor: "", observations: "" });
  const [hospitalForm, setHospitalForm] = useState({ date: new Date().toISOString().split("T")[0], dischargeDate: "", facility: "", reason: "", diagnosis: "", doctor: "", prescription: "", notes: "" });
  const [profileForm, setProfileForm] = useState({ name: "", relationship: "", birthDate: "", bloodType: "", allergies: "", comorbidities: "", medications: "", physicalActivity: "", familyHistory: "" });
  const [examPhotoBase64, setExamPhotoBase64] = useState<string | null>(null);
  const [vaccineForm, setVaccineForm] = useState({ name: "", dose: "", dueDate: "", appliedDate: "", isApplied: false, batch: "" });

  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ storeName: "consultations" | "exams" | "vitals" | "vaccines"; id: string } | null>(null);

  // States for AI health summary
  const [generateLoading, setGenerateLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`ai_summary_${member.id}`);
    } catch (_) {
      return null;
    }
  });

  // Keep AI summary synchronized when switching family members
  React.useEffect(() => {
    try {
      setAiSummary(localStorage.getItem(`ai_summary_${member.id}`));
    } catch (_) {
      setAiSummary(null);
    }
  }, [member.id]);

  const handleGenerateSummary = async () => {
    setGenerateLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member,
          consultations: memberConsultations,
          exams: memberExams,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ? (data.details ? `${data.error} (${data.details})` : data.error) : "Falha ao gerar o resumo.");
      }

      setAiSummary(data.summary);
      try {
        localStorage.setItem(`ai_summary_${member.id}`, data.summary);
      } catch (_) {
        // Safe fail
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erro ao conectar com a Inteligência Artificial.");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Document Metadata
      doc.setProperties({
        title: `Resumo Clínico - ${member.name}`,
        subject: "Dossiê de Saúde para Consulta Médica",
        author: "Prontuário Familiar Inteligente",
        creator: "Prontuário Familiar"
      });

      // Header Banner
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, "F");

      // Title on Banner
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Dossiê Resumo de Saúde", 15, 18);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(219, 234, 254);
      doc.text(`Prontuário gerado para apresentação em consulta médica | Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 27);

      // Section 1: Ficha do Paciente
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("1. Identificação do Paciente", 15, 52);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 55, 195, 55);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      // Quick Grid Information
      doc.setFont("Helvetica", "bold"); doc.text("Nome Completo:", 15, 63);
      doc.setFont("Helvetica", "normal"); doc.text(member.name || "Não informado", 50, 63);

      doc.setFont("Helvetica", "bold"); doc.text("Parentesco:", 15, 69);
      doc.setFont("Helvetica", "normal"); doc.text(member.relationship || "Não informado", 50, 69);

      doc.setFont("Helvetica", "bold"); doc.text("Nascimento:", 15, 75);
      doc.setFont("Helvetica", "normal"); 
      const bDateText = member.birthDate ? `${formatDate(member.birthDate)} (${getAge(member.birthDate)} anos)` : "Não informado";
      doc.text(bDateText, 50, 75);

      doc.setFont("Helvetica", "bold"); doc.text("Tipo Sanguíneo:", 15, 81);
      doc.setFont("Helvetica", "normal"); 
      doc.setTextColor(220, 38, 38);
      doc.text(member.bloodType || "Não informado", 50, 81);
      doc.setTextColor(71, 85, 105);

      // Latest weights and heights
      const latestWeightObj = memberVitals.find(v => v.weight !== undefined && v.weight !== null && Number(v.weight) > 0);
      const latestWeight = latestWeightObj ? `${latestWeightObj.weight} kg (${formatDate(latestWeightObj.date)})` : "Não registrado";

      const latestHeightObj = memberVitals.find(v => v.height !== undefined && v.height !== null && Number(v.height) > 0);
      const latestHeight = latestHeightObj ? `${latestHeightObj.height} cm (${formatDate(latestHeightObj.date)})` : "Não registrado";

      doc.setFont("Helvetica", "bold"); doc.text("Peso Recente:", 15, 87);
      doc.setFont("Helvetica", "normal"); doc.text(latestWeight, 50, 87);

      doc.setFont("Helvetica", "bold"); doc.text("Altura Recente:", 15, 93);
      doc.setFont("Helvetica", "normal"); doc.text(latestHeight, 50, 93);

      let posY = 105;

      const checkPageOverflow = (neededHeight: number) => {
        if (posY + neededHeight > 275) {
          doc.addPage();
          posY = 20;
          return true;
        }
        return false;
      };

      const drawSectionHeader = (title: string) => {
        checkPageOverflow(25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(title, 15, posY);
        posY += 3;
        doc.setDrawColor(226, 232, 240);
        doc.line(15, posY, 195, posY);
        posY += 8;
      };

      // Section 2: Ficha Médica Básica
      drawSectionHeader("2. Condição de Saúde Básica");
      doc.setFontSize(9);

      // Quick side-by-side or concise lines for clinical status
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Alergias Documentadas:", 15, posY);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const allergiesText = member.allergies || "Nenhuma registrada.";
      const splittedAllergies = doc.splitTextToSize(allergiesText, 135);
      doc.text(splittedAllergies, 60, posY);
      posY += (splittedAllergies.length * 4.5);

      checkPageOverflow(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Doenças & Comorbidades:", 15, posY);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const comorbiditiesText = member.comorbidities || "Nenhuma registrada.";
      const splittedComorb = doc.splitTextToSize(comorbiditiesText, 135);
      doc.text(splittedComorb, 60, posY);
      posY += (splittedComorb.length * 4.5);

      checkPageOverflow(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Medicações Contínuas:", 15, posY);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const medicationsText = member.medications || "Nenhuma registrada.";
      const splittedMed = doc.splitTextToSize(medicationsText, 135);
      doc.text(splittedMed, 60, posY);
      posY += (splittedMed.length * 4.5) + 6;

      // Section 3: Consultas Clínicas
      drawSectionHeader("3. Últimas 5 Consultas Clínicas");
      doc.setFontSize(9);

      if (memberConsultations.length === 0) {
        doc.setFont("Helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhuma consulta registrada até o momento.", 15, posY);
        posY += 8;
      } else {
        doc.setTextColor(71, 85, 105);
        const last5Consultations = memberConsultations.slice(0, 5);
        for (const c of last5Consultations) {
          let prescriptionLines: string[] = [];
          if (c.prescription) {
            prescriptionLines = doc.splitTextToSize(`Conduta/Prescrição: ${c.prescription}`, 172);
          }
          const itemHeight = 4.5 + 4 + (prescriptionLines.length > 0 ? (prescriptionLines.length * 4) : 0) + 2;
          checkPageOverflow(itemHeight);
          
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`• [${formatDate(c.date)}] - ${c.specialty} (Dr. ${c.doctor})`, 15, posY);
          posY += 4;
          
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          doc.text(`Local: ${c.facility} | Motivo: ${c.reason || "Rotina"}`, 19, posY);
          posY += 4;

          if (c.prescription && prescriptionLines.length > 0) {
            doc.setFont("Helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text(prescriptionLines, 19, posY);
            posY += (prescriptionLines.length * 4);
          }
          doc.setFontSize(9);
          posY += 1.5;
        }
        posY += 4;
      }

      // Section 4: Exames Clínicos e Laboratoriais
      drawSectionHeader("4. Últimos 5 Exames Realizados");
      doc.setFontSize(9);

      if (memberExams.length === 0) {
        doc.setFont("Helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhum exame clínico ou de laboratório registrado.", 15, posY);
        posY += 8;
      } else {
        doc.setTextColor(71, 85, 105);
        const last5Exams = memberExams.slice(0, 5);
        for (const e of last5Exams) {
          let obsLines: string[] = [];
          if (e.observations) {
            obsLines = doc.splitTextToSize(`Resultado/Obs: ${e.observations}`, 172);
          }
          const itemHeight = 4.5 + 4 + (obsLines.length > 0 ? (obsLines.length * 4) : 0) + 2;
          checkPageOverflow(itemHeight);
          
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`• [${formatDate(e.date)}] - ${e.title} (${e.category || "Exame"})`, 15, posY);
          posY += 4;
          
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          doc.text(`Unidade: ${e.facility} | Solicitante: ${e.doctor || "Não informado"}`, 19, posY);
          posY += 4;

          if (e.observations && obsLines.length > 0) {
            doc.setFont("Helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text(obsLines, 19, posY);
            posY += (obsLines.length * 4);
          }
          doc.setFontSize(9);
          posY += 1.5;
        }
      }

      // Footer
      checkPageOverflow(30);
      posY += 10;
      doc.setDrawColor(203, 213, 225);
      doc.line(15, posY, 195, posY);
      posY += 6;
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Dossiê gerado pelo Prontuário Familiar Digital. Apresente este relatório impresso ou portátil ao seu médico assistente.", 15, posY);

      const filename = `Resumo_Saude_${member.name.replace(/\s+/g, "_")}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      setErrorText(`Falha ao gerar o resumo em formato PDF: ${err.message || String(err)}`);
    }
  };

  // Helper function to render formatted markdown response simply and gracefully
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    
    return (
      <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed text-left">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;
          
          if (trimmed.startsWith("###")) {
            return (
              <h5 key={idx} className="font-extrabold text-blue-900 text-xs sm:text-sm mt-3.5 mb-1.5 flex items-center gap-1.5">
                {parseBoldText(trimmed.replace(/^###\s*/, ""))}
              </h5>
            );
          }
          if (trimmed.startsWith("##")) {
            return (
              <h4 key={idx} className="font-black text-blue-950 text-sm sm:text-base mt-4 mb-2">
                {parseBoldText(trimmed.replace(/^##\s*/, ""))}
              </h4>
            );
          }
          
          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            const content = trimmed.replace(/^[-*]\s*/, "");
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5 my-1">
                <span className="text-blue-500 mt-1 sm:mt-1.5 shrink-0 select-none">•</span>
                <span className="flex-1 text-gray-700">{parseBoldText(content)}</span>
              </div>
            );
          }
          
          return (
            <p key={idx} className="my-1 text-gray-600">
              {parseBoldText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Filter states for consultations
  const [consultSpecialtyFilter, setConsultSpecialtyFilter] = useState<string>("all");
  const [consultStartDate, setConsultStartDate] = useState<string>("");
  const [consultEndDate, setConsultEndDate] = useState<string>("");

  // Filter state for exams
  const [examTypeFilter, setExamTypeFilter] = useState<"all" | "laboratorial" | "imagem" | "outro">("all");

  // Vaccine Calendar States & Helpers
  const [vaccineView, setVaccineView] = useState<"calendar" | "booklet">("calendar");
  // Helper to determine if female
  const isFemaleMember = (m: typeof member) => {
    if (m.gender) {
      return m.gender === "F";
    }
    const rel = (m.relationship || "").toLowerCase();
    const femaleTerms = ["mãe", "mae", "filha", "avó", "avo", "tia", "irmã", "irma", "esposa", "mulher", "prima", "madrasta", "enteada", "gestante", "grávida", "gravida"];
    return femaleTerms.some(term => rel.includes(term));
  };

  const [isPregnantOverride, setIsPregnantOverride] = useState<boolean>(() => {
    // Check if eligible
    const today = new Date();
    const birth = new Date(member.birthDate);
    let years = 0;
    if (member.birthDate && !isNaN(birth.getTime())) {
      years = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        years--;
      }
    }
    const isEligible = isFemaleMember(member) && years >= 12;
    if (!isEligible) return false;

    const rel = (member.relationship || "").toLowerCase();
    return rel.includes("gestante") || rel.includes("grávida") || rel.includes("gravida");
  });
  const [selectedCalendarFilter, setSelectedCalendarFilter] = useState<"all" | "overdue" | "pending" | "applied" | "future" | "expired">("all");

  // Sync pregnancy toggle when member changes
  React.useEffect(() => {
    const today = new Date();
    const birth = new Date(member.birthDate);
    let years = 0;
    if (member.birthDate && !isNaN(birth.getTime())) {
      years = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        years--;
      }
    }
    const isEligible = isFemaleMember(member) && years >= 12;
    if (!isEligible) {
      setIsPregnantOverride(false);
      return;
    }

    const rel = (member.relationship || "").toLowerCase();
    setIsPregnantOverride(rel.includes("gestante") || rel.includes("grávida") || rel.includes("gravida"));
  }, [member.id, member.relationship, member.birthDate, member.gender]);

  // Helper to calculate total days, months, and years precisely
  const getPreciseAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const diffTime = today.getTime() - birth.getTime();
    const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      months += 12;
    }

    const totalMonths = years * 12 + months;

    return { years, months, totalMonths, totalDays };
  };

  // Helper to match catalog recommendation with logged history
  const getRecommendationStatus = (reco: typeof RECOMMENDED_VACCINES[0]) => {
    // 1. Check if applied
    const isApplied = memberVaccines.some(v => {
      if (v.status !== "applied") return false;
      const nameMatch = reco.keywords.some(kw => 
        v.name.toLowerCase().includes(kw.toLowerCase()) || 
        v.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(kw.toLowerCase())
      );
      if (!nameMatch) return false;
      
      // Let's refine matching by dose. If reco specifies a particular dose, try to match it
      const recoDoseLower = reco.dose.toLowerCase();
      const vDoseLower = v.dose.toLowerCase();

      // Reforço match
      const recoIsReforco = recoDoseLower.includes("reforço") || recoDoseLower.includes("reforco");
      const vIsReforco = vDoseLower.includes("reforço") || vDoseLower.includes("reforco");
      if (recoIsReforco !== vIsReforco) return false;

      // Dose única match
      const recoIsUnica = recoDoseLower.includes("única") || recoDoseLower.includes("unica") || recoDoseLower.includes("único") || recoDoseLower.includes("unico");
      const vIsUnica = vDoseLower.includes("única") || vDoseLower.includes("unica") || vDoseLower.includes("único") || vDoseLower.includes("unico");
      if (recoIsUnica !== vIsUnica) return false;

      // Digit match
      const numPattern = reco.dose.match(/\d/);
      const vNumPattern = v.dose.match(/\d/);
      if (numPattern || vNumPattern) {
        if (!numPattern || !vNumPattern || numPattern[0] !== vNumPattern[0]) {
          return false;
        }
      }
      return true;
    });

    if (isApplied) return "applied";

    // 2. Check age constraints
    const ageInfo = getPreciseAge(member.birthDate);
    if (!ageInfo) return "pending";

    // Severe rigid limit checks (e.g. Rotavirus)
    if (reco.rigidLimitDays && ageInfo.totalDays > reco.rigidLimitDays) {
      return "expired";
    }

    // Overdue check
    if (ageInfo.totalMonths > reco.ageMaxInMonths) {
      return "overdue";
    }

    // Future check
    if (ageInfo.totalMonths < reco.ageMinInMonths) {
      return "future";
    }

    return "pending";
  };

  // Automated recommended vaccine Quick Logger
  const handleAutoRegisterRecommendation = async (reco: typeof RECOMMENDED_VACCINES[0], status: "applied" | "pending") => {
    try {
      const { dbService } = await import("../lib/db.ts");
      const today = new Date().toISOString().split("T")[0];
      const vaccineId = `vaccine_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const newVaccine: Vaccine = {
        id: vaccineId,
        memberId: member.id,
        name: reco.name,
        dose: reco.dose,
        status: status,
        appliedDate: status === "applied" ? today : undefined,
        dueDate: status === "pending" ? today : undefined
      };

      await dbService.saveVaccine(newVaccine);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao registrar imunizante recomendado automaticamente.");
    }
  };

  // Prefills standard Add Vaccine form with recommended template fields
  const handlePrefillAddForm = (reco: typeof RECOMMENDED_VACCINES[0]) => {
    setVaccineForm({
      name: reco.name,
      dose: reco.dose,
      dueDate: new Date().toISOString().split("T")[0],
      appliedDate: new Date().toISOString().split("T")[0],
      isApplied: true,
      batch: "",
    });
    setShowAddVaccine(true);
    
    // Smooth scroll to add form
    const container = document.getElementById("vaccine-form-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Filtered lists for this member - excluding surgical procedures and hospitalizations
  const memberConsultations = consultations
    .filter((c) => c.memberId === member.id && !(c.specialty?.toLowerCase().includes("cirurgia") || c.reason?.toLowerCase().includes("cirurgia") || (c as any).isSurgery || (c as any).isHospitalization || c.id.startsWith("hospitalization_") || c.specialty?.toLowerCase().includes("internação") || c.specialty?.toLowerCase().includes("internacao")))
    .sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));

  // Surgical procedures list - excluding hospitalizations
  const memberSurgeries = consultations
    .filter((c) => c.memberId === member.id && !((c as any).isHospitalization || c.id.startsWith("hospitalization_") || c.specialty?.toLowerCase().includes("internação") || c.specialty?.toLowerCase().includes("internacao")) && (c.specialty?.toLowerCase().includes("cirurgia") || c.reason?.toLowerCase().includes("cirurgia") || (c as any).isSurgery))
    .sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));

  // Hospitalizations list ("Internações")
  const memberHospitalizations = consultations
    .filter((c) => c.memberId === member.id && ((c as any).isHospitalization || c.id.startsWith("hospitalization_") || c.specialty?.toLowerCase().includes("internação") || c.specialty?.toLowerCase().includes("internacao")))
    .sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));

  // Extract available unique specialties for this member
  const availableSpecialties = Array.from(
    new Set(
      consultations
        .filter((c) => c.memberId === member.id && c.specialty)
        .map((c) => c.specialty.trim())
    )
  ).sort();

  // Apply filters dynamically
  const filteredConsultations = memberConsultations.filter((c) => {
    // Specialty Filter
    const matchesSpecialty =
      consultSpecialtyFilter === "all" ||
      c.specialty.trim().toLowerCase() === consultSpecialtyFilter.trim().toLowerCase();

    // Date Range Filter
    const matchesStartDate = !consultStartDate || c.date >= consultStartDate;
    const matchesEndDate = !consultEndDate || c.date <= consultEndDate;

    return matchesSpecialty && matchesStartDate && matchesEndDate;
  });
    
  const getExamType = (exam: Exam): "laboratorial" | "imagem" | "outro" => {
    const text = `${exam.title || ""} ${exam.category || ""} ${exam.observations || ""}`.toLowerCase();
    
    const labKeywords = [
      "laborat", "sangue", "hemograma", "urina", "fezes", "colesterol", 
      "glicemia", "glicose", "hormon", "sorologia", "bioquim", "pcr", 
      "plaquet", "creatinina", "urea", "trigliceri", "tireoide", "tsh", "t4", 
      "bacterioscopia", "parasitolog", "liquido", "analise", "clonagem", "cultura",
      "papanicolau", "parasitológico"
    ];
    
    const imgKeywords = [
      "imagem", "ultrassom", "ultra-som", "eco", "ecografia", "raio-x", "raio x", "rx", 
      "radiografia", "tomografia", "ressonancia", "endoscopia", "colonoscopia", "mamografia", 
      "ecocardiograma", "eletrocardiograma", "ecg", "eeg", "cintilografia", "scann", "ressonância"
    ];
    
    const isLab = labKeywords.some(kw => text.includes(kw));
    const isImg = imgKeywords.some(kw => text.includes(kw));
    
    if (isLab) return "laboratorial";
    if (isImg) return "imagem";
    return "outro";
  };

  const memberExams = exams
    .filter((e) => e.memberId === member.id)
    .sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));

  const filteredExams = memberExams.filter((e) => {
    if (examTypeFilter === "all") return true;
    return getExamType(e) === examTypeFilter;
  });

  const labCount = memberExams.filter((e) => getExamType(e) === "laboratorial").length;
  const imgCount = memberExams.filter((e) => getExamType(e) === "imagem").length;
  const otherCount = memberExams.filter((e) => getExamType(e) === "outro").length;

  const memberVaccines = vaccines
    .filter((v) => v.memberId === member.id)
    .sort((a, b) => {
      const dateA = a.appliedDate || a.dueDate || "";
      const dateB = b.appliedDate || b.dueDate || "";
      return parseDateToTime(dateB) - parseDateToTime(dateA);
    });

  const memberVitals = vitals
    .filter((v) => v.memberId === member.id)
    .sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));

  // Find latest weight and height
  const latestWeightObj = memberVitals.find(v => v.weight !== undefined && v.weight !== null && Number(v.weight) > 0);
  const latestWeight = latestWeightObj ? `${latestWeightObj.weight} kg` : "Não informado";

  const latestHeightObj = memberVitals.find(v => v.height !== undefined && v.height !== null && Number(v.height) > 0);
  const latestHeight = latestHeightObj ? `${latestHeightObj.height} cm` : "Não informado";

  // 1. Health Dashboard Calculations (Today is 2026-06-15)
  const todayStr = "2026-06-15";
  const lastConsultationObj = memberConsultations.find(c => c.date <= todayStr) || memberConsultations[0];
  const lastConsultationVal = lastConsultationObj ? formatDate(lastConsultationObj.date) : "Não registrada";

  const lastExamObj = memberExams.find(e => e.date <= todayStr) || memberExams[0];
  const lastExamVal = lastExamObj ? formatDate(lastExamObj.date) : "Não registrado";

  // Dynamic pending & overdue vaccine calculations (incorporating recommended calendars + manual entries)
  const ageInfoForCounters = getPreciseAge(member.birthDate);
  const memberYearsForCounters = ageInfoForCounters?.years || 0;

  const activeEligibleVaccines = RECOMMENDED_VACCINES.filter(reco => {
    if (reco.group === "gestantes") {
      return isPregnantOverride;
    }
    if (memberYearsForCounters >= 60) {
      return reco.group === "elderly" || reco.group === "adults";
    }
    if (memberYearsForCounters >= 25) {
      return reco.group === "adults";
    }
    return reco.group === "children";
  });

  const recommendedPendingOrOverdue = activeEligibleVaccines.filter(reco => {
    const status = getRecommendationStatus(reco);
    return status === "overdue" || status === "pending";
  });

  const customManualPendingOrOverdue = memberVaccines.filter(v => {
    // Check if manually pending or overdue
    const statusStr = v.status as string;
    const isManualPendingOrOverdue = statusStr === "overdue" || statusStr === "pending" || (statusStr === "pending" && v.dueDate && v.dueDate < todayStr);
    if (!isManualPendingOrOverdue) return false;

    // Filter out if it matches any recommendation to avoid double counting
    const matchesAnyReco = activeEligibleVaccines.some(reco => {
      return reco.keywords.some(kw => 
        v.name.toLowerCase().includes(kw.toLowerCase()) || 
        v.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(kw.toLowerCase())
      );
    });

    return !matchesAnyReco;
  });

  const pendingVaccinesVal = recommendedPendingOrOverdue.length + customManualPendingOrOverdue.length;

  const nextRetornoObj = consultations
    .filter(c => c.memberId === member.id && c.date >= todayStr)
    .sort((a, b) => parseDateToTime(a.date) - parseDateToTime(b.date))[0];
  const proximoRetornoVal = nextRetornoObj ? formatDate(nextRetornoObj.date) : "Não agendado";

  // 2. Medical Timeline Calculations (last per event)
  const timelineLastConsult = memberConsultations[0];
  const timelineLastExam = memberExams[0];
  const timelineLastSurgery = memberSurgeries[0];
  const timelineLastBloodExam = memberExams.find(e => {
    const text = `${e.title || ""} ${e.category || ""} ${e.observations || ""}`.toLowerCase();
    const bloodKeywords = ["sangue", "hemograma", "glicose", "colesterol", "glicemia", "blood", "plaqueta", "creatinina", "urea", "trigliceri", "tsh", "t4", "sorologia"];
    return bloodKeywords.some(kw => text.includes(kw)) || getExamType(e) === "laboratorial";
  });
  const timelineLastVaccine = [...vaccines]
    .filter(v => v.memberId === member.id && v.status === "applied" && v.appliedDate)
    .sort((a, b) => parseDateToTime(b.appliedDate || "") - parseDateToTime(a.appliedDate || ""))[0];

  // Age Calculator
  function getAge(birthDate: string) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  function formatDate(dateStr: string) {
    if (!dateStr || typeof dateStr !== "string") return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  // Submit Hanlders
  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const vital: HealthVital = {
        id: `vital_${Date.now()}`,
        memberId: member.id,
        date: vitalForm.date,
        weight: vitalForm.weight ? parseFloat(vitalForm.weight) : undefined,
        systolicBP: vitalForm.sys ? parseInt(vitalForm.sys) : undefined,
        diastolicBP: vitalForm.dia ? parseInt(vitalForm.dia) : undefined,
        bloodGlucose: vitalForm.glucose ? parseInt(vitalForm.glucose) : undefined,
        heartRate: vitalForm.hr ? parseInt(vitalForm.hr) : undefined,
        height: vitalForm.height ? parseFloat(vitalForm.height) : undefined,
      };

      await dbService.saveVital(vital);
      setShowAddVital(false);
      setVitalForm({ date: new Date().toISOString().split("T")[0], weight: "", sys: "", dia: "", glucose: "", hr: "", height: "" });
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar sinais vitais.");
    }
  };

  const handleStartEditVital = (vital: HealthVital) => {
    setEditingVital(vital);
    setEditVitalForm({
      date: vital.date,
      weight: vital.weight !== undefined ? vital.weight.toString() : "",
      sys: vital.systolicBP !== undefined ? vital.systolicBP.toString() : "",
      dia: vital.diastolicBP !== undefined ? vital.diastolicBP.toString() : "",
      glucose: vital.bloodGlucose !== undefined ? vital.bloodGlucose.toString() : "",
      hr: vital.heartRate !== undefined ? vital.heartRate.toString() : "",
      height: vital.height !== undefined ? vital.height.toString() : ""
    });
  };

  const handleSaveVitalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVital) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: HealthVital = {
        ...editingVital,
        date: editVitalForm.date,
        weight: editVitalForm.weight ? parseFloat(editVitalForm.weight) : undefined,
        systolicBP: editVitalForm.sys ? parseInt(editVitalForm.sys) : undefined,
        diastolicBP: editVitalForm.dia ? parseInt(editVitalForm.dia) : undefined,
        bloodGlucose: editVitalForm.glucose ? parseInt(editVitalForm.glucose) : undefined,
        heartRate: editVitalForm.hr ? parseInt(editVitalForm.hr) : undefined,
        height: editVitalForm.height ? parseFloat(editVitalForm.height) : undefined,
      };

      await dbService.saveVital(updated);
      setEditingVital(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações dos sinais vitais.");
    }
  };

  const handleStartEditConsultation = (consult: Consultation) => {
    setEditingConsultation(consult);
    setEditConsultForm({
      date: consult.date,
      specialty: consult.specialty,
      doctor: consult.doctor || "",
      facility: consult.facility || "",
      reason: consult.reason || "",
      prescription: consult.prescription || "",
      notes: consult.notes || ""
    });
  };

  const handleSaveConsultationEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultation) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: Consultation = {
        ...editingConsultation,
        date: editConsultForm.date,
        specialty: editConsultForm.specialty,
        doctor: editConsultForm.doctor,
        facility: editConsultForm.facility,
        reason: editConsultForm.reason,
        prescription: editConsultForm.prescription,
        notes: editConsultForm.notes
      };

      await dbService.saveConsultation(updated);
      setEditingConsultation(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações da consulta.");
    }
  };

  const handleStartEditSurgery = (surgery: Consultation) => {
    setEditingSurgery(surgery);
    setEditSurgeryForm({
      date: surgery.date,
      title: surgery.reason || "",
      specialty: (surgery.specialty || "").replace(" (Cirurgia)", ""),
      doctor: surgery.doctor || "",
      facility: surgery.facility || "",
      prescription: surgery.prescription || "",
      notes: surgery.notes || ""
    });
  };

  const handleSaveSurgeryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSurgery) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: Consultation = {
        ...editingSurgery,
        date: editSurgeryForm.date,
        specialty: editSurgeryForm.specialty ? `${editSurgeryForm.specialty} (Cirurgia)` : "Cirurgia Geral",
        doctor: editSurgeryForm.doctor,
        facility: editSurgeryForm.facility,
        reason: editSurgeryForm.title,
        prescription: editSurgeryForm.prescription,
        notes: editSurgeryForm.notes
      };

      await dbService.saveConsultation(updated);
      setEditingSurgery(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações do procedimento cirúrgico.");
    }
  };

  const handleAddHospitalization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const consult: Consultation = {
        id: `hospitalization_${Date.now()}`,
        memberId: member.id,
        date: hospitalForm.date,
        specialty: "Internação Médica",
        doctor: hospitalForm.doctor,
        facility: hospitalForm.facility,
        reason: hospitalForm.reason,
        prescription: hospitalForm.prescription,
        notes: hospitalForm.notes,
        isHospitalization: true,
        dischargeDate: hospitalForm.dischargeDate || undefined,
        diagnosis: hospitalForm.diagnosis || undefined
      };

      await dbService.saveConsultation(consult);
      setShowAddHospitalization(false);
      setHospitalForm({
        date: new Date().toISOString().split("T")[0],
        dischargeDate: "",
        facility: "",
        reason: "",
        diagnosis: "",
        doctor: "",
        prescription: "",
        notes: ""
      });
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar internação.");
    }
  };

  const handleStartEditHospitalization = (hospitalization: Consultation) => {
    setEditingHospitalization(hospitalization);
    setEditHospitalForm({
      date: hospitalization.date,
      dischargeDate: hospitalization.dischargeDate || "",
      facility: hospitalization.facility || "",
      reason: hospitalization.reason || "",
      diagnosis: hospitalization.diagnosis || "",
      doctor: hospitalization.doctor || "",
      prescription: hospitalization.prescription || "",
      notes: hospitalization.notes || ""
    });
  };

  const handleSaveHospitalizationEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospitalization) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: Consultation = {
        ...editingHospitalization,
        date: editHospitalForm.date,
        dischargeDate: editHospitalForm.dischargeDate || undefined,
        facility: editHospitalForm.facility,
        reason: editHospitalForm.reason,
        diagnosis: editHospitalForm.diagnosis,
        doctor: editHospitalForm.doctor,
        prescription: editHospitalForm.prescription,
        notes: editHospitalForm.notes,
        isHospitalization: true
      };

      await dbService.saveConsultation(updated);
      setEditingHospitalization(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações da internação.");
    }
  };

  const handleStartEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setEditExamForm({
      date: exam.date,
      title: exam.title,
      category: exam.category,
      facility: exam.facility,
      doctor: exam.doctor || "",
      observations: exam.observations || ""
    });
  };

  const handleSaveExamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: Exam = {
        ...editingExam,
        date: editExamForm.date,
        title: editExamForm.title,
        category: editExamForm.category,
        facility: editExamForm.facility,
        doctor: editExamForm.doctor,
        observations: editExamForm.observations
      };

      await dbService.saveExam(updated);
      setEditingExam(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações do exame.");
    }
  };

  const handleStartEditVaccine = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    setEditVaccineForm({
      name: vaccine.name,
      dose: vaccine.dose,
      status: vaccine.status,
      dueDate: vaccine.dueDate || "",
      appliedDate: vaccine.appliedDate || "",
      batch: vaccine.batch || ""
    });
  };

  const handleSaveVaccineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVaccine) return;
    try {
      const { dbService } = await import("../lib/db.ts");
      const isApplied = editVaccineForm.status === "applied";
      const updated: Vaccine = {
        ...editingVaccine,
        name: editVaccineForm.name,
        dose: editVaccineForm.dose,
        status: editVaccineForm.status as "applied" | "pending" | "overdue",
        dueDate: isApplied ? undefined : editVaccineForm.dueDate,
        appliedDate: isApplied ? editVaccineForm.appliedDate : undefined,
        batch: isApplied ? editVaccineForm.batch : undefined
      };

      // Check overdue state if pending
      const today = new Date().toISOString().split("T")[0];
      if (updated.status === "pending" && updated.dueDate && updated.dueDate < today) {
        updated.status = "overdue";
      }

      await dbService.saveVaccine(updated);
      setEditingVaccine(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar as alterações da vacina.");
    }
  };

  const handleAddSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const consult: Consultation = {
        id: `surgery_${Date.now()}`,
        memberId: member.id,
        date: surgeryForm.date,
        specialty: surgeryForm.specialty ? `${surgeryForm.specialty} (Cirurgia)` : "Cirurgia Geral",
        doctor: surgeryForm.doctor,
        facility: surgeryForm.facility,
        reason: surgeryForm.title,
        prescription: surgeryForm.prescription,
        notes: surgeryForm.notes,
      };
      (consult as any).isSurgery = true;

      await dbService.saveConsultation(consult);
      setShowAddSurgery(false);
      setSurgeryForm({
        date: new Date().toISOString().split("T")[0],
        title: "",
        specialty: "",
        doctor: "",
        facility: "",
        prescription: "",
        notes: ""
      });
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar procedimento cirúrgico.");
    }
  };

  const handleStartEditProfile = () => {
    setProfileForm({
      name: member.name || "",
      relationship: member.relationship || "",
      birthDate: member.birthDate || "",
      bloodType: member.bloodType || "",
      allergies: member.allergies || "",
      comorbidities: member.comorbidities || "",
      medications: member.medications || "",
      physicalActivity: member.physicalActivity || "",
      familyHistory: member.familyHistory || ""
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: FamilyMember = {
        ...member,
        name: profileForm.name,
        relationship: profileForm.relationship,
        birthDate: profileForm.birthDate,
        bloodType: profileForm.bloodType,
        allergies: profileForm.allergies,
        comorbidities: profileForm.comorbidities,
        medications: profileForm.medications,
        physicalActivity: profileForm.physicalActivity,
        familyHistory: profileForm.familyHistory
      };

      await dbService.saveMember(updated);
      setShowEditProfileModal(false);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar dados do prontuário.");
    }
  };

  const handleDeleteProfile = async () => {
    if (confirmDeleteId !== member.id) {
      setConfirmDeleteId(member.id);
      return;
    }
    try {
      const { dbService } = await import("../lib/db.ts");
      
      // Cascade-delete related data inside IndexedDB
      const pConsults = await dbService.getConsultations();
      for (const c of pConsults.filter(item => item.memberId === member.id)) {
        await dbService.deleteConsultation(c.id);
      }
      
      const pExams = await dbService.getExams();
      for (const ex of pExams.filter(item => item.memberId === member.id)) {
        await dbService.deleteExam(ex.id);
      }

      const pVitals = await dbService.getVitals();
      for (const vt of pVitals.filter(item => item.memberId === member.id)) {
        await dbService.deleteVital(vt.id);
      }

      const pVaccines = await dbService.getVaccines();
      for (const vc of pVaccines.filter(item => item.memberId === member.id)) {
        await dbService.deleteVaccine(vc.id);
      }

      await dbService.deleteMember(member.id);
      setShowEditProfileModal(false);
      setConfirmDeleteId(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao excluir integrante.");
    }
  };

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const consult: Consultation = {
        id: `consult_${Date.now()}`,
        memberId: member.id,
        ...consultForm
      };

      await dbService.saveConsultation(consult);
      setShowAddConsultation(false);
      setConsultForm({ date: new Date().toISOString().split("T")[0], specialty: "", doctor: "", facility: "", reason: "", prescription: "", notes: "" });
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar consulta.");
    }
  };

  const handleExamPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExamPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const exam: Exam = {
        id: `exam_${Date.now()}`,
        memberId: member.id,
        ...examForm,
        photoUrl: examPhotoBase64 || undefined
      };

      await dbService.saveExam(exam);
      setShowAddExam(false);
      setExamForm({ date: new Date().toISOString().split("T")[0], title: "", category: "", facility: "", doctor: "", observations: "" });
      setExamPhotoBase64(null);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao salvar exame.");
    }
  };

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { dbService } = await import("../lib/db.ts");
      const vaccine: Vaccine = {
        id: `vaccine_${Date.now()}`,
        memberId: member.id,
        name: vaccineForm.name,
        dose: vaccineForm.dose,
        status: vaccineForm.isApplied ? "applied" : "pending",
        dueDate: vaccineForm.isApplied ? undefined : vaccineForm.dueDate,
        appliedDate: vaccineForm.isApplied ? vaccineForm.appliedDate : undefined,
        batch: vaccineForm.isApplied ? vaccineForm.batch : undefined
      };

      // Check overdue state
      const today = new Date().toISOString().split("T")[0];
      if (vaccine.status === "pending" && vaccine.dueDate && vaccine.dueDate < today) {
        vaccine.status = "overdue";
      }

      await dbService.saveVaccine(vaccine);
      setShowAddVaccine(false);
      setVaccineForm({ name: "", dose: "", dueDate: "", appliedDate: "", isApplied: false, batch: "" });
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao registrar vacina.");
    }
  };

  const handleToggleVaccineApplied = async (vaccine: Vaccine) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const { dbService } = await import("../lib/db.ts");
      const updated: Vaccine = {
        ...vaccine,
        status: "applied",
        appliedDate: today,
        batch: "Aplicado via App"
      };

      await dbService.saveVaccine(updated);
      onDataChanged();
    } catch (err) {
      setErrorText("Erro ao atualizar vacina.");
    }
  };

  const handleDeleteItem = async (storeName: "consultations" | "exams" | "vitals" | "vaccines", id: string) => {
    setItemToDelete({ storeName, id });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id={`profile-card-${member.id}`}>
      {/* Member Header Zone */}
      <div className="p-5 sm:p-6 bg-slate-50 border-b border-gray-100">
        {/* Responsive Navbar Style Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-gray-200/50">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
            Prontuário Individual de Saúde
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-generate-pdf-summary"
              onClick={handleGeneratePDF}
              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100/90 active:scale-95 text-rose-750 font-extrabold border border-rose-150 rounded-lg text-[10px] flex items-center gap-1 shadow-3xs transition-all cursor-pointer shrink-0 select-none"
            >
              <FileText className="w-3.5 h-3.5 text-rose-650" />
              Gerar Resumo PDF
            </button>
            <button
              type="button"
              id="btn-edit-member-direct"
              onClick={() => handleStartEditProfile()}
              className="py-1 px-2.5 bg-white hover:bg-slate-100 active:scale-95 text-blue-600 font-extrabold border border-slate-205 rounded-lg text-[10px] flex items-center gap-1 shadow-3xs transition-all cursor-pointer shrink-0 select-none"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Dados
            </button>
            <button
              type="button"
              id="btn-import-spreadsheet"
              onClick={() => setShowSpreadsheetImport(true)}
              className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100/85 active:scale-95 text-emerald-700 font-extrabold border border-emerald-150 rounded-lg text-[10px] flex items-center gap-1 shadow-3xs transition-all cursor-pointer shrink-0 select-none"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importar Planilha
            </button>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full text-center sm:text-left">
          {/* Avatar */}
          {member.avatarUrl ? (
            <img 
              src={member.avatarUrl} 
              alt={member.name} 
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm shrink-0 mx-auto sm:mx-0"
            />
          ) : (
            <div className={`w-20 h-20 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-extrabold text-2xl shadow-sm uppercase shrink-0 mx-auto sm:mx-0 border-4 border-white`}>
              {(member.name || member.relationship).substring(0, 2)}
            </div>
          )}

          {/* Texts */}
          <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full justify-center sm:justify-start">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight whitespace-normal break-words">
                {member.name || "Sem Nome"}
              </h1>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-105 uppercase tracking-wider w-fit shrink-0 mx-auto sm:mx-0">
                {member.relationship}
              </span>
            </div>

            <div className="mt-2.5 select-none flex items-center gap-1.5 text-xs text-gray-650 font-bold bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/50 w-fit">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                {getAge(member.birthDate) !== null 
                  ? `${getAge(member.birthDate)} anos (${formatDate(member.birthDate)})`
                  : "Data de nascimento não definida"}
              </span>
            </div>
          </div>
        </div>

        {/* BELOW: Sangue, Alergia, Comorbidades, Medicamentos, Peso e Altura */}
        <div className="w-full mt-6 pt-5 border-t border-slate-200/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
            {/* Tipo Sanguíneo */}
            <div className="bg-red-50/15 border border-red-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-red-200/65 transition-colors">
              <div className="p-1 bg-red-50 text-red-650 rounded-lg shrink-0 mt-0.5">
                <Heart className="w-3.5 h-3.5 fill-red-50" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Tipo Sanguíneo</span>
                <p className="text-xs font-black text-red-650 mt-1 whitespace-normal break-words">
                  {member.bloodType || "Não informado"}
                </p>
              </div>
            </div>

            {/* Alergias */}
            <div className="bg-amber-50/15 border border-amber-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-amber-200/65 transition-colors">
              <div className="p-1 bg-amber-50 text-amber-500 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Alergias</span>
                <p className="text-xs font-bold text-amber-905 mt-1 whitespace-normal break-words">
                  {member.allergies || "Nenhuma registrada"}
                </p>
              </div>
            </div>

            {/* Comorbidades */}
            <div className="bg-rose-50/15 border border-rose-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-rose-200/65 transition-colors">
              <div className="p-1 bg-rose-50 text-rose-600 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-605" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Comorbidades</span>
                <p className="text-xs font-bold text-rose-900 mt-1 whitespace-normal break-words">
                  {member.comorbidities || "Nenhuma registrada"}
                </p>
              </div>
            </div>

            {/* Medicamentos em Uso */}
            <div className="bg-emerald-50/15 border border-emerald-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-emerald-200/65 transition-colors">
              <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                <HeartPulse className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Medicamentos em Uso</span>
                <p className="text-xs font-bold text-emerald-950 mt-1 whitespace-normal break-words">
                  {member.medications || "Nenhum em uso contínuo"}
                </p>
              </div>
            </div>

            {/* Peso */}
            <div className="bg-sky-50/15 border border-sky-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-sky-200/65 transition-colors">
              <div className="p-1 bg-sky-50 text-sky-600 rounded-lg shrink-0 mt-0.5">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Peso</span>
                <p className="text-xs font-black text-sky-950 mt-1 whitespace-normal break-words">
                  {latestWeight}
                </p>
              </div>
            </div>

            {/* Altura */}
            <div className="bg-indigo-50/15 border border-indigo-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-indigo-200/65 transition-colors">
              <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                <Ruler className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Altura</span>
                <p className="text-xs font-black text-indigo-950 mt-1 whitespace-normal break-words">
                  {latestHeight}
                </p>
              </div>
            </div>

            {/* Atividade Física Regular */}
            <div className="bg-teal-50/15 border border-teal-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-teal-200/65 transition-colors">
              <div className="p-1 bg-teal-50 text-teal-600 rounded-lg shrink-0 mt-0.5">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Atividade Física</span>
                <p className="text-xs font-bold text-teal-950 mt-1 whitespace-normal break-words">
                  {member.physicalActivity || "Não informada / Sedentário"}
                </p>
              </div>
            </div>

            {/* Antecedentes Familiares */}
            <div className="bg-purple-50/15 border border-purple-100/60 p-3 rounded-xl flex items-start gap-2.5 shadow-3xs hover:border-purple-200/65 transition-colors">
              <div className="p-1 bg-purple-50 text-purple-650 rounded-lg shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5 leading-none">Antecedentes Familiares</span>
                <p className="text-xs font-bold text-purple-950 mt-1 whitespace-normal break-words">
                  {member.familyHistory || "Nenhum histórico registrado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-white scrollbar-none" id="profile-tabs" style={{ scrollbarWidth: "none" }}>
        <div className="flex min-w-max sm:min-w-full w-full">
          {(["summary", "consultations", "surgeries", "hospitalizations", "exams", "vaccines"] as ProfileTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            const labels = {
              summary: "Acompanhamento",
              consultations: "Consultas",
              surgeries: "Cirurgias",
              hospitalizations: "Internações",
              exams: "Exames",
              vaccines: "Vacinas"
            };
            const Icons = {
              summary: Heart,
              consultations: Calendar,
              surgeries: Activity,
              hospitalizations: Hospital,
              exams: Clipboard,
              vaccines: Syringe
            };
            const Icon = Icons[tab];

            return (
              <button
                key={tab}
                type="button"
                className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isSelected 
                    ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/5" 
                    : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/50"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  setErrorText(null);
                }}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                <span>{labels[tab]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content wrapper */}
      <div className="p-6">
        
        {errorText && (
          <div className="mb-4 bg-red-50 text-red-800 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" onClick={() => setErrorText(null)} />
            {errorText}
          </div>
        )}

        {/* 1. Summary & Vitals Tracking */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            
            {/* Dashboard de Saúde Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
              {/* Card 1: Última consulta */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/50 to-white border border-blue-100 rounded-xl shadow-3xs">
                <div className="flex items-center gap-2 mb-1.5 text-blue-600">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-blue-500/90">Última Consulta</span>
                </div>
                <div className="text-sm font-black text-slate-800 tracking-tight">
                  {lastConsultationVal}
                </div>
                {lastConsultationObj && (
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full font-medium">
                    Dr. {lastConsultationObj.doctor} ({lastConsultationObj.specialty})
                  </div>
                )}
              </div>

              {/* Card 2: Último exame */}
              <div className="p-3.5 bg-gradient-to-br from-teal-50/40 to-white border border-teal-100 rounded-xl shadow-3xs">
                <div className="flex items-center gap-2 mb-1.5 text-teal-600">
                  <Clipboard className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-teal-500/90">Último Exame</span>
                </div>
                <div className="text-sm font-black text-slate-805 text-slate-800 tracking-tight">
                  {lastExamVal}
                </div>
                {lastExamObj && (
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full font-medium">
                    {lastExamObj.title}
                  </div>
                )}
              </div>

              {/* Card 3: Vacinas pendentes */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50/50 to-white border border-amber-100 rounded-xl shadow-3xs">
                <div className="flex items-center gap-2 mb-1.5 text-amber-600">
                  <Syringe className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-500/90">Vacinas Pendentes</span>
                </div>
                <div className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span>{pendingVaccinesVal}</span>
                  {pendingVaccinesVal > 0 && (
                    <span className="bg-red-500 text-white rounded-full text-[9px] font-black px-1.5 py-0.2 animate-pulse">
                      Ação
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-medium">
                  {pendingVaccinesVal === 1 ? "1 dose pendente" : `${pendingVaccinesVal} doses pendentes`}
                </div>
              </div>

              {/* Card 4: Próximo Retorno */}
              <div className="p-3.5 bg-gradient-to-br from-purple-50/50 to-white border border-purple-100 rounded-xl shadow-3xs">
                <div className="flex items-center gap-2 mb-1.5 text-purple-600">
                  <HeartPulse className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-purple-500/90">Próximo Retorno</span>
                </div>
                <div className="text-sm font-black text-slate-800 tracking-tight">
                  {proximoRetornoVal}
                </div>
                {nextRetornoObj && (
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full font-medium">
                    Dr. {nextRetornoObj.doctor} ({nextRetornoObj.specialty})
                  </div>
                )}
              </div>
            </div>

            {/* Linha do Tempo Médica Card */}
            <div className="p-5 bg-white border border-slate-200/70 rounded-2xl shadow-3xs text-left space-y-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Linha do Tempo Médica Recente
                </h4>
                <p className="text-[10px] text-gray-400 font-medium">
                  Últimos acontecimentos médicos e exames registrados
                </p>
              </div>

              {/* Tree timeline hierarchy */}
              <div className="pl-3 space-y-3.5 relative border-l border-slate-100">
                {/* 1. Consulta */}
                <div className="relative">
                  {/* Timeline bullet/node */}
                  <div className="absolute -left-[17px] top-1 w-2 w-2 h-2 rounded-full bg-blue-500 border border-white shadow-3xs" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-850 flex items-center gap-1">
                        ├ Consulta
                      </span>
                      {timelineLastConsult ? (
                        <p className="text-xs text-slate-500 font-semibold pl-4">
                          {timelineLastConsult.specialty} — Dr. {timelineLastConsult.doctor} ({timelineLastConsult.facility})
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium pl-4 italic">Nenhuma consulta registrada</p>
                      )}
                    </div>
                    {timelineLastConsult && (
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-100 self-start sm:self-auto uppercase tracking-wide">
                        {formatDate(timelineLastConsult.date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Exame sangue */}
                <div className="relative">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-red-400 border border-white shadow-3xs" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-850 flex items-center gap-1">
                        ├ Exame sangue
                      </span>
                      {timelineLastBloodExam ? (
                        <p className="text-xs text-slate-500 font-semibold pl-4">
                          {timelineLastBloodExam.title} ({timelineLastBloodExam.facility})
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium pl-4 italic">Nenhum exame de sangue registrado</p>
                      )}
                    </div>
                    {timelineLastBloodExam && (
                      <span className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-100 self-start sm:self-auto uppercase tracking-wide">
                        {formatDate(timelineLastBloodExam.date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Vacina */}
                <div className="relative">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-emerald-500 border border-white shadow-3xs" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-850 flex items-center gap-1">
                        ├ Vacina
                      </span>
                      {timelineLastVaccine ? (
                        <p className="text-xs text-slate-500 font-semibold pl-4">
                          {timelineLastVaccine.name} (Dose: {timelineLastVaccine.dose || "Dose Única"}) {timelineLastVaccine.batch ? `| Lote: ${timelineLastVaccine.batch}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium pl-4 italic">Nenhuma vacina aplicada registrada</p>
                      )}
                    </div>
                    {timelineLastVaccine && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-100 self-start sm:self-auto uppercase tracking-wide">
                        {formatDate(timelineLastVaccine.appliedDate || "")}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Exame */}
                <div className="relative">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-teal-500 border border-white shadow-3xs" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-850 flex items-center gap-1">
                        ├ Exame
                      </span>
                      {timelineLastExam ? (
                        <p className="text-xs text-slate-500 font-semibold pl-4">
                          {timelineLastExam.title} [{timelineLastExam.category || "Geral"}] ({timelineLastExam.facility})
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium pl-4 italic">Nenhum exame geral registrado</p>
                      )}
                    </div>
                    {timelineLastExam && (
                      <span className="bg-teal-50 text-teal-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-teal-100 self-start sm:self-auto uppercase tracking-wide">
                        {formatDate(timelineLastExam.date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Cirurgia */}
                <div className="relative">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-purple-500 border border-white shadow-3xs" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-850 flex items-center gap-1">
                        └ Cirurgia
                      </span>
                      {timelineLastSurgery ? (
                        <p className="text-xs text-slate-500 font-semibold pl-4">
                          {timelineLastSurgery.reason || timelineLastSurgery.specialty} ({timelineLastSurgery.facility})
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium pl-4 italic">Nenhuma cirurgia registrada</p>
                      )}
                    </div>
                    {timelineLastSurgery && (
                      <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-100 self-start sm:self-auto uppercase tracking-wide">
                        {formatDate(timelineLastSurgery.date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Card Widget */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/60 via-blue-50/30 to-white border border-indigo-150/90 rounded-2xl shadow-3xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5 text-left">
                  <div className="p-1.5 sm:p-2 bg-blue-100/70 text-blue-600 rounded-lg shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-950 text-xs sm:text-sm flex items-center gap-1.5">
                      Resumo Clínico Inteligente (IA)
                    </h4>
                    <p className="text-[10px] sm:text-2xs text-gray-400 font-medium leading-tight">
                      Análise automatizada de comorbidades, parâmetros, exames e últimas consultas
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  id="btn-generate-ai-summary"
                  disabled={generateLoading}
                  onClick={handleGenerateSummary}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-3xs transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto ${
                    generateLoading 
                      ? "bg-slate-100 text-slate-400 border border-slate-200" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {generateLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      {aiSummary ? "Refazer Resumo" : "Gerar Resumo"}
                    </>
                  )}
                </button>
              </div>

              {/* Summary Presentation Content */}
              {aiSummary ? (
                <div className="bg-white/85 backdrop-blur-xs border border-indigo-100/20 p-3 sm:p-3.5 rounded-xl space-y-2">
                  <div className="text-xs text-gray-700">
                    {renderMarkdown(aiSummary)}
                  </div>
                  
                  <div className="flex justify-end gap-2 text-[9px] text-gray-400 border-t border-slate-100 pt-2 mt-1 select-none">
                    <span>*Gerado dinamicamente com base nas informações do histórico.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center flex flex-col items-center">
                  <div className="p-1 px-1.5 bg-indigo-50/45 rounded-full text-indigo-500/80 mb-1.5">
                    <Sparkles className="w-4 h-4 opacity-70 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Sem resumo recente</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5 leading-tight">
                    Clique em Gerar Resumo para analisar o histórico deste prontuário.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Gráficos de Parâmetros de Saúde</h3>
                <p className="text-xs text-gray-500">Histórico de acompanhamento de peso, pressão e glicemia</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVital(!showAddVital)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Parâmetros
              </button>
            </div>

            {showAddVital && (
              <form onSubmit={handleAddVital} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left">
                <h4 className="font-bold text-sm text-gray-800">Nova Aferição Clínica</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={vitalForm.date}
                      onChange={(e) => setVitalForm({ ...vitalForm, date: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 75.5"
                      value={vitalForm.weight}
                      onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Glicemia (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 92"
                      value={vitalForm.glucose}
                      onChange={(e) => setVitalForm({ ...vitalForm, glucose: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">P.A. Sistólica (Máx)</label>
                    <input
                      type="number"
                      placeholder="Ex: 120"
                      value={vitalForm.sys}
                      onChange={(e) => setVitalForm({ ...vitalForm, sys: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">P.A. Diastólica (Mín)</label>
                    <input
                      type="number"
                      placeholder="Ex: 80"
                      value={vitalForm.dia}
                      onChange={(e) => setVitalForm({ ...vitalForm, dia: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Batimentos (bpm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 72"
                      value={vitalForm.hr}
                      onChange={(e) => setVitalForm({ ...vitalForm, hr: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 154.5"
                      value={vitalForm.height}
                      onChange={(e) => setVitalForm({ ...vitalForm, height: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-emerald-600 font-bold hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Aferição
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddVital(false)}
                    className="py-1.5 px-3 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Health Line Charts container */}
            <HealthTrendsChart member={member} vitals={vitals} />

            {/* Recent Vitals list */}
            {memberVitals.length > 0 && (
              <div className="mt-4">
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-3">História Recente de Sinais Clinicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {memberVitals.slice(0, 3).map((vital) => (
                    <div key={vital.id} className="p-3.5 border border-gray-100 bg-gray-50/30 rounded-xl relative">
                      <button
                        type="button"
                        onClick={() => handleStartEditVital(vital)}
                        className="absolute right-2 top-2 p-1 text-blue-600 hover:bg-blue-50 rounded bg-white hover:text-blue-700 transition-colors cursor-pointer border border-slate-200/55"
                        title="Editar aferição"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-xs text-gray-500 font-semibold mb-2">{formatDate(vital.date)}</div>
                      <div className="space-y-1 text-sm font-medium pr-6">
                        {vital.weight && <p className="text-gray-700">⚖️ Peso: <strong className="text-gray-900 font-bold">{vital.weight} kg</strong></p>}
                        {vital.height && <p className="text-gray-700">📏 Altura: <strong className="text-gray-900 font-bold">{vital.height} cm</strong></p>}
                        {vital.systolicBP && vital.diastolicBP && (
                          <p className="text-gray-700">🩸 Pressão: <strong className="text-gray-900 font-bold">{vital.systolicBP}/{vital.diastolicBP} mmHg</strong></p>
                        )}
                        {vital.bloodGlucose && <p className="text-gray-700 font-medium">🍬 Glicemia: <strong className="text-gray-900 font-bold">{vital.bloodGlucose} mg/dL</strong></p>}
                        {vital.heartRate && <p className="text-gray-700 font-medium">💓 F.C.: <strong className="text-gray-900 font-bold">{vital.heartRate} bpm</strong></p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Medical Consultations */}
        {activeTab === "consultations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Prontuário de Consultas</h3>
                <p className="text-xs text-gray-500">Histórico detalhado de consultas e agendas médicas futuras</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddConsultation(!showAddConsultation)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Consulta
              </button>
            </div>

            {showAddConsultation && (
              <form onSubmit={handleAddConsultation} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left">
                <h4 className="font-bold text-sm text-gray-800">Nova Consulta Médica</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={consultForm.date}
                      onChange={(e) => setConsultForm({ ...consultForm, date: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Especialidade / Categoria</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cardiologia, Pediatria"
                      value={consultForm.specialty}
                      onChange={(e) => setConsultForm({ ...consultForm, specialty: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Responsável</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Roberto"
                      value={consultForm.doctor}
                      onChange={(e) => setConsultForm({ ...consultForm, doctor: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Unidade / Hospital</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hospital Paulistano, Posto Pró-Saúde"
                    value={consultForm.facility}
                    onChange={(e) => setConsultForm({ ...consultForm, facility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Motivo da Consulta</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Sintomas, dor crônica, queixas gerais ou rotina..."
                      value={consultForm.reason}
                      onChange={(e) => setConsultForm({ ...consultForm, reason: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Receita Médica / Medicamento Prescrito</label>
                    <textarea
                      rows={2}
                      placeholder="Dosagens e medicamentos prescritos..."
                      value={consultForm.prescription}
                      onChange={(e) => setConsultForm({ ...consultForm, prescription: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Informações Adicionais / Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Anotações gerais relevantes..."
                    value={consultForm.notes}
                    onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 font-bold hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Consulta
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddConsultation(false)}
                    className="py-2 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* List Consultations */}
            {memberConsultations.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left mb-4" id="consultation-filters">
                <div>
                  <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 select-none">
                    Filtrar Especialidade
                  </label>
                  <select
                    value={consultSpecialtyFilter}
                    onChange={(e) => setConsultSpecialtyFilter(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100 text-slate-700 cursor-pointer"
                  >
                    <option value="all">Todas as Especialidades</option>
                    {availableSpecialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 select-none">
                    Data Inicial (De)
                  </label>
                  <input
                    type="date"
                    value={consultStartDate}
                    onChange={(e) => setConsultStartDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100 text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 select-none">
                    Data Final (Até)
                  </label>
                  <input
                    type="date"
                    value={consultEndDate}
                    onChange={(e) => setConsultEndDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100 text-slate-700"
                  />
                </div>

                {(consultSpecialtyFilter !== "all" || consultStartDate || consultEndDate) && (
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConsultSpecialtyFilter("all");
                        setConsultStartDate("");
                        setConsultEndDate("");
                      }}
                      className="py-1.5 px-3 bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-bold text-xxs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      Limpar Filtros aplicados
                    </button>
                  </div>
                )}
              </div>
            )}

            {memberConsultations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Nenhuma consulta registrada</p>
                <p className="text-xs bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 mt-2 text-gray-500">Agende e organize o calendário médico familiar!</p>
              </div>
            ) : filteredConsultations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Nenhuma consulta encontrada para os filtros selecionados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setConsultSpecialtyFilter("all");
                    setConsultStartDate("");
                    setConsultEndDate("");
                  }}
                  className="mt-3.5 py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConsultations.map((item) => {
                  const isFuture = item.date >= new Date().toISOString().split("T")[0];
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-5 rounded-2xl border transition-all relative ${
                        isFuture 
                          ? "border-blue-200 bg-blue-50/10 shadow-3xs" 
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleStartEditConsultation(item)}
                        className="absolute right-4 top-4 p-1.5 text-blue-600 hover:bg-blue-50 bg-white hover:text-blue-700 border border-slate-200/55 rounded transition-colors cursor-pointer"
                        title="Editar consulta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                          {formatDate(item.date)}
                        </span>
                        
                        <span className={`text-xxs font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                          isFuture ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-gray-100 text-gray-600"
                        }`}>
                          {isFuture ? "Agendado / Lembrar" : "Concluído"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase">Especialidade</span>
                          <h4 className="font-extrabold text-gray-800 text-base">{item.specialty}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 font-semibold">CRM: {item.doctor}</p>
                          <p className="text-2xs text-gray-400 font-medium">{item.facility}</p>
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Motivo do Atendimento</span>
                          <p className="text-xs text-gray-700 font-medium mt-1 leading-relaxed">{item.reason || "Não especificado."}</p>
                          
                          {item.prescription && (
                            <div className="mt-3 p-2.5 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                              <span className="text-3xs font-extrabold text-amber-800 uppercase block leading-none mb-1">Medicamentos e Receita</span>
                              <p className="text-2xs font-semibold text-amber-900 whitespace-pre-line">{item.prescription}</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Instruções / Anotações do Paciente</span>
                          <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium mt-1 leading-relaxed whitespace-pre-line">
                            {item.notes || "Nenhuma anotação adicional registrada."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Physical Exams Registry */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Histórico de Exames Realizados</h3>
                <p className="text-xs text-gray-500">Prontuário com imagens físicas dos laudos e aferições</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExam(!showAddExam)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Exame Manual
              </button>
            </div>

            {/* SmartScan Guidance */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-left select-none">
                <span className="text-xs font-black text-blue-900">Dica Prática com IA 💡</span>
                <p className="text-2xs text-blue-800 mt-1 leading-normal">
                  Deseja extrair as informações automaticamente de um exame sem precisar digitar tudo? <strong className="font-bold">Use a aba central "SmartScan IA"</strong> no menu do topo do aplicativo para escanear a imagem via câmera do celular!
                </p>
              </div>
            </div>

            {showAddExam && (
              <form onSubmit={handleAddExam} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left">
                <h4 className="font-bold text-sm text-gray-800">Novo Exame Médico</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Título do Exame / Laudo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Hemograma, Ultrassom"
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={examForm.date}
                      onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Área / Especialidade</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Análises Clínicas, Oftalmo"
                      value={examForm.category}
                      onChange={(e) => setExamForm({ ...examForm, category: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Laboratório / Clínica</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fleury, Laboratório Municipal"
                      value={examForm.facility}
                      onChange={(e) => setExamForm({ ...examForm, facility: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Requisitante</label>
                    <input
                      type="text"
                      placeholder="Ex: Dr. Silva"
                      value={examForm.doctor}
                      onChange={(e) => setExamForm({ ...examForm, doctor: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Laudo / Observações dos Valores de Referência</label>
                  <textarea
                    rows={3}
                    placeholder="Valores observados, dosagem, resultados e referências interpretadas..."
                    value={examForm.observations}
                    onChange={(e) => setExamForm({ ...examForm, observations: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="block text-2xs font-bold text-gray-600 mb-2">Anexar Laudo do Exame (Câmera, Imagem ou PDF)</span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      id="btn-exam-camera"
                      onClick={() => document.getElementById("exam-camera-input")?.click()}
                      className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4 text-blue-500" />
                      Tirar Foto (Câmera)
                    </button>
                    
                    <button
                      type="button"
                      id="btn-exam-file"
                      onClick={() => document.getElementById("exam-file-input")?.click()}
                      className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Escolher Foto ou PDF
                    </button>

                    {examPhotoBase64 && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-xl">
                        <span className={`text-2xs font-bold flex items-center gap-1.5 ${examPhotoBase64.startsWith("data:application/pdf") ? "text-indigo-600" : "text-emerald-600"}`}>
                          <Check className="w-3.5 h-3.5" />
                          {examPhotoBase64.startsWith("data:application/pdf") ? "PDF Anexado!" : "Foto Anexada!"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExamPhotoBase64(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover anexo"
                        >
                          <X className="w-3.5 h-3.5 font-bold" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Native Camera input optimized for mobile instant capture */}
                  <input
                    type="file"
                    id="exam-camera-input"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleExamPhotoCapture}
                  />

                  {/* Standard file/photo selector accepts images + pdfs */}
                  <input
                    type="file"
                    id="exam-file-input"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleExamPhotoCapture}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 font-bold hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Exame
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExam(false);
                      setExamPhotoBase64(null);
                    }}
                    className="py-2 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Filter Exams Pills */}
            {memberExams.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100/60 mt-1 select-none">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pl-2 pr-1">
                  Filtrar Exames:
                </span>
                <button
                  type="button"
                  onClick={() => setExamTypeFilter("all")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    examTypeFilter === "all"
                      ? "bg-slate-900 text-white shadow-3xs"
                      : "text-slate-600 hover:text-slate-950 bg-white border border-slate-200/50"
                  }`}
                >
                  Todos ({memberExams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExamTypeFilter("laboratorial")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examTypeFilter === "laboratorial"
                      ? "bg-blue-600 text-white shadow-3xs"
                      : "text-blue-600 bg-blue-50/50 hover:bg-blue-100/50 border border-blue-100/40"
                  }`}
                >
                  <Beaker className="w-3.5 h-3.5" />
                  Laboratoriais ({labCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExamTypeFilter("imagem")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examTypeFilter === "imagem"
                      ? "bg-amber-600 text-white shadow-3xs"
                      : "text-amber-800 bg-amber-50/50 hover:bg-amber-100/50 border border-amber-100/40"
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  Imagem ({imgCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExamTypeFilter("outro")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examTypeFilter === "outro"
                      ? "bg-slate-600 text-white shadow-3xs"
                      : "text-slate-600 bg-slate-100/70 hover:bg-slate-200 border border-slate-200/45"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Outros ({otherCount})
                </button>
              </div>
            )}

            {/* List Exams */}
            {memberExams.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-gray-100">
                <Clipboard className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Nenhum exame cadastrado</p>
                <p className="text-xs bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 mt-2 text-gray-500">Cadastre para guardar laudos e imagens!</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white border border-dashed border-gray-150 rounded-3xl p-6">
                <Clipboard className="w-10 h-10 mx-auto text-gray-300 mb-2 animate-pulse" />
                <p className="font-bold text-gray-700 text-sm">Nenhum exame deste tipo</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Não há exames deste paciente auto-classificados como "{examTypeFilter === "laboratorial" ? "Laboratoriais" : examTypeFilter === "imagem" ? "Imagem" : "Outros"}" no prontuário.</p>
                <button
                  type="button"
                  onClick={() => setExamTypeFilter("all")}
                  className="mt-4 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer shadow-3xs active:scale-95"
                >
                  Limpar Filtros de Busca
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((item) => (
                  <div key={item.id} className="p-5 border border-gray-105 rounded-2xl bg-white hover:border-gray-200 transition-all relative flex flex-col justify-between text-left">
                    <button
                      type="button"
                      onClick={() => handleStartEditExam(item)}
                      className="absolute right-4 top-4 p-1.5 text-blue-600 hover:bg-blue-50 bg-white hover:text-blue-700 border border-slate-200/55 rounded transition-colors cursor-pointer"
                      title="Editar exame"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md uppercase">
                          {item.category}
                        </span>

                        {getExamType(item) === "laboratorial" && (
                          <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 border border-blue-150 px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <Beaker className="w-2.5 h-2.5" />
                            Laboratorial
                          </span>
                        )}
                        {getExamType(item) === "imagem" && (
                          <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 border border-amber-150 px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <Image className="w-2.5 h-2.5" />
                            Imagem
                          </span>
                        )}
                        {getExamType(item) === "outro" && (
                          <span className="text-[9px] font-extrabold text-slate-700 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            Outro
                          </span>
                        )}

                        <span className="text-xs text-gray-400 font-semibold ml-auto sm:ml-0">{formatDate(item.date)}</span>
                      </div>

                      <h4 className="font-extrabold text-gray-800 text-base">{item.title}</h4>
                      <p className="text-xs font-semibold text-gray-700 leading-normal mt-1">Laboratório: {item.facility}</p>
                      
                      {item.doctor && <p className="text-2xs text-gray-400 font-medium mt-0.5">Médico solicitante: {item.doctor}</p>}
                      
                      {item.observations && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-3xs font-extrabold text-gray-400 uppercase tracking-wide block">Resultado / Diagnóstico</span>
                          <p className="text-2xs font-semibold text-gray-600 leading-normal mt-1 whitespace-pre-line">{item.observations}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      {item.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingPhotoUrl(item.photoUrl || null)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          {item.photoUrl.startsWith("data:application/pdf") ? (
                            <>
                              <FileText className="w-4 h-4 text-indigo-500 shadow-3xs" />
                              Ver PDF do Exame
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 shadow-3xs" />
                              Ver Foto do Exame
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-2xs text-gray-400 font-semibold italic flex items-center gap-1">
                          Sem foto ou PDF em anexo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Vaccine Scorecard */}
        {activeTab === "vaccines" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Carteira de Vacinação</h3>
                <p className="text-xs text-gray-500">Histórico de doses aplicadas, controle de pendências e calendário vacinal inteligente</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVaccine(!showAddVaccine)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Vacina
              </button>
            </div>

            {/* View Switcher Pills */}
            <div className="flex border-b border-gray-150 pb-0.5 select-none">
              <button
                type="button"
                onClick={() => setVaccineView("calendar")}
                className={`pb-2.5 px-4 font-extrabold text-xs transition-all relative cursor-pointer ${
                  vaccineView === "calendar"
                    ? "text-blue-600 border-b-2 border-blue-600 font-black"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                🗓️ Calendário Inteligente (Recomendações)
              </button>
              <button
                type="button"
                onClick={() => setVaccineView("booklet")}
                className={`pb-2.5 px-4 font-extrabold text-xs transition-all relative cursor-pointer ${
                  vaccineView === "booklet"
                    ? "text-blue-600 border-b-2 border-blue-600 font-black"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                📋 Minha Carteira / Histórico ({memberVaccines.length})
              </button>
            </div>

            {showAddVaccine && (
              <form id="vaccine-form-container" onSubmit={handleAddVaccine} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left">
                <h4 className="font-bold text-sm text-gray-800">Nova Vacina / Imunizante</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Nome da Vacina</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Tríplice Viral, Gripe"
                      value={vaccineForm.name}
                      onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Dose</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1ª Dose, Reforço, Dose Única"
                      value={vaccineForm.dose}
                      onChange={(e) => setVaccineForm({ ...vaccineForm, dose: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-800">O integrante já tomou essa vacina?</span>
                    <p className="text-2xs text-gray-500">Marque se já tiver sido aplicada</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={vaccineForm.isApplied}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, isApplied: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-400"
                  />
                </div>

                {vaccineForm.isApplied ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Aplicação</label>
                      <input
                        type="date"
                        required
                        value={vaccineForm.appliedDate}
                        onChange={(e) => setVaccineForm({ ...vaccineForm, appliedDate: e.target.value })}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-gray-600 mb-1">Lote / Fabricante</label>
                      <input
                        type="text"
                        placeholder="Ex: Lote TR5512B / Fiocruz"
                        value={vaccineForm.batch}
                        onChange={(e) => setVaccineForm({ ...vaccineForm, batch: e.target.value })}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Prazo sugerido de vencimento</label>
                    <input
                      type="date"
                      required
                      value={vaccineForm.dueDate}
                      onChange={(e) => setVaccineForm({ ...vaccineForm, dueDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 font-bold hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Registro
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddVaccine(false)}
                    className="py-2 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {vaccineView === "calendar" ? (
              <div className="space-y-6">
                {/* 1. Header Information Summary (Ficha) */}
                {(() => {
                  const ageInfo = getPreciseAge(member.birthDate);
                  if (!ageInfo) {
                    return (
                      <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-left text-xs font-semibold">
                        Por favor, adicione a data de nascimento deste membro no seu perfil para obter o calendário vacinal personalizado.
                      </div>
                    );
                  }

                  const years = ageInfo.years;
                  const totalMonths = ageInfo.totalMonths;
                  
                  // Decide appropriate standard age category text
                  let categoryLabel = "Infantil (Crianças)";
                  if (years >= 60) {
                    categoryLabel = "Idosos (60+) e Melhor Idade";
                  } else if (years >= 25) {
                    categoryLabel = "Adultos (25 a 59 Anos)";
                  } else if (years >= 10) {
                    categoryLabel = "Adolescentes e Jovens (10 a 24 Anos)";
                  } else if (years >= 6) {
                    categoryLabel = "Infantojuvenil (6 a 9 Anos)";
                  } else if (totalMonths >= 24) {
                    categoryLabel = "Primeira Infância (2 a 5 Anos)";
                  } else {
                    categoryLabel = "Bebês e Lactentes (0 a 23 Meses)";
                  }

                  // Retrieve matching vaccines list based on target age coorte
                  const eligibleVaccines = RECOMMENDED_VACCINES.filter(reco => {
                    // Always show gestantes vaccines if toggled
                    if (reco.group === "gestantes") {
                      return isPregnantOverride;
                    }
                    if (years >= 60) {
                      // Elderly can take elderly rules or standard adult rules (e.g. dT or Hep B)
                      return reco.group === "elderly" || reco.group === "adults";
                    }
                    if (years >= 25) {
                      return reco.group === "adults";
                    }
                    // Under 25 matches children & adolescents guidelines
                    return reco.group === "children";
                  });

                  // Evaluate counts for status progress
                  let overdueCount = 0;
                  let appliedCount = 0;
                  let pendingCount = 0;
                  let futureCount = 0;
                  let expiredCount = 0;

                  const analyzedEligible = eligibleVaccines.map(reco => {
                    const status = getRecommendationStatus(reco);
                    if (status === "overdue") overdueCount++;
                    else if (status === "applied") appliedCount++;
                    else if (status === "pending") pendingCount++;
                    else if (status === "future") futureCount++;
                    else if (status === "expired") expiredCount++;

                    return { ...reco, calculatedStatus: status };
                  });

                  const filteredAnalyzed = analyzedEligible.filter(item => {
                    if (selectedCalendarFilter === "all") return true;
                    return item.calculatedStatus === selectedCalendarFilter;
                  });

                  const totalEligibleCount = analyzedEligible.length;
                  const pctOk = totalEligibleCount > 0 ? Math.round((appliedCount / totalEligibleCount) * 100) : 0;

                  return (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/60 text-left animate-in fade-in duration-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <span className="text-3xs font-extrabold uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Perfil de Imunidade
                            </span>
                            <h4 className="font-extrabold text-gray-900 mt-2 text-base md:text-lg">
                              {member.name}
                            </h4>
                            <p className="text-xs font-semibold text-gray-600 mt-0.5">
                              Idade: <strong className="text-gray-800">{years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : ""} {ageInfo.months > 0 ? `${ageInfo.months} ${ageInfo.months === 1 ? 'mês' : 'meses'}` : years === 0 ? "Menos de 1 mês" : ""}</strong> ({ageInfo.totalMonths} meses acumulados)
                            </p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">
                              Grupo Recomendado: <strong className="text-blue-600 font-bold">{categoryLabel}</strong>
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            {/* Gestante Mode Switch - Only eligible for females above 12 years old */}
                            {isFemaleMember(member) && years >= 12 && (
                              <label className="flex items-center gap-2.5 bg-emerald-50/55 p-3 rounded-xl border border-emerald-100/70 cursor-pointer hover:bg-emerald-50 transition-colors select-none animate-in fade-in zoom-in-95 duration-150">
                                <input
                                  type="checkbox"
                                  checked={isPregnantOverride}
                                  onChange={(e) => setIsPregnantOverride(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                                />
                                <div>
                                  <span className="text-xs font-extrabold text-emerald-800 block">Foco Pré-Natal (Gestante)</span>
                                  <span className="text-4xs font-semibold text-emerald-600 block leading-none mt-0.5">Ativar vacinas indicadas na gestação</span>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Progress Tracker */}
                        <div className="mt-5 pt-4 border-t border-slate-200/60">
                          <div className="flex items-center justify-between mb-1.5 text-xs">
                            <span className="font-bold text-gray-700">Imunização Governamental Coberta:</span>
                            <span className="font-black text-blue-600">{appliedCount} de {totalEligibleCount} ({pctOk}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${pctOk}%` }} 
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarFilter("all")}
                              className={`py-1.5 px-2 bg-white hover:bg-slate-50 border rounded-lg text-3xs font-extrabold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                selectedCalendarFilter === "all" ? "border-slate-800 text-slate-800 font-black shadow-xs" : "border-slate-150 text-slate-500"
                              }`}
                            >
                              <span>Todas</span>
                              <span className="text-xs mt-0.5 text-slate-700 font-black">{totalEligibleCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarFilter("overdue")}
                              className={`py-1.5 px-2 bg-white hover:bg-red-50 border rounded-lg text-3xs font-extrabold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                selectedCalendarFilter === "overdue" ? "border-red-600 text-red-600 font-black shadow-xs bg-red-50/10" : "border-slate-150 text-red-500/80"
                              }`}
                            >
                              <span>🚨 Atrasadas</span>
                              <span className="text-xs mt-0.5 font-black">{overdueCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarFilter("pending")}
                              className={`py-1.5 px-2 bg-white hover:bg-amber-50 border rounded-lg text-3xs font-extrabold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                selectedCalendarFilter === "pending" ? "border-amber-500 text-amber-700 font-black shadow-xs bg-amber-50/10" : "border-slate-150 text-amber-500"
                              }`}
                            >
                              <span>⏳ Aplicar / No Prazo</span>
                              <span className="text-xs mt-0.5 font-black">{pendingCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarFilter("applied")}
                              className={`py-1.5 px-2 bg-white hover:bg-emerald-50 border rounded-lg text-3xs font-extrabold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                selectedCalendarFilter === "applied" ? "border-emerald-600 text-emerald-600 font-black shadow-xs bg-emerald-50/10" : "border-slate-150 text-emerald-600/80"
                              }`}
                            >
                              <span>✅ Em Dia</span>
                              <span className="text-xs mt-0.5 font-black">{appliedCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarFilter("future")}
                              className={`py-1.5 px-2 bg-white hover:bg-blue-50 border rounded-lg text-3xs font-extrabold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                selectedCalendarFilter === "future" ? "border-blue-500 text-blue-600 font-black shadow-xs bg-blue-50/10" : "border-slate-150 text-blue-500"
                              }`}
                            >
                              <span>📅 Futuras</span>
                              <span className="text-xs mt-0.5 font-black">{futureCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 2. Vaccine Listing Cards */}
                      <div className="space-y-3">
                        {filteredAnalyzed.length === 0 ? (
                          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Info className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                            <p className="text-xs font-extrabold text-slate-600">Nenhum imunizante nesta categoria de filtro</p>
                            <p className="text-3xs text-slate-400 mt-0.5">Altere o filtro acima para explorar outras imunizações do calendário.</p>
                          </div>
                        ) : (
                          filteredAnalyzed.map(reco => {
                            const isOverdue = reco.calculatedStatus === "overdue";
                            const isApplied = reco.calculatedStatus === "applied";
                            const isPending = reco.calculatedStatus === "pending";
                            const isFuture = reco.calculatedStatus === "future";
                            const isExpired = reco.calculatedStatus === "expired";

                            return (
                              <div
                                key={reco.id}
                                className={`p-4 rounded-xl border transition-all text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                  isOverdue
                                    ? "border-red-200 bg-red-50/10 hover:bg-red-50/25"
                                    : isApplied
                                      ? "border-emerald-100 bg-emerald-50/5 hover:bg-emerald-50/15"
                                      : isPending
                                        ? "border-amber-100 bg-amber-50/10 hover:bg-amber-50/20"
                                        : isFuture
                                          ? "border-blue-50 bg-slate-50/30 text-gray-500"
                                          : "border-slate-200 bg-gray-100/50 grayscale opacity-65"
                                }`}
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    <h5 className="font-extrabold text-sm text-gray-900 leading-tight">
                                      {reco.name}
                                    </h5>
                                    
                                    <span className="text-4xs font-black bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                                      {reco.dose}
                                    </span>
                                    
                                    <span className="text-4xs font-black bg-blue-105 text-blue-700 px-1.5 py-0.5 rounded">
                                      {reco.targetAgeText}
                                    </span>

                                    <span className={`text-[9px] font-black tracking-normal px-2 py-0.5 rounded-full ${
                                      isOverdue
                                        ? "bg-red-500 text-white animate-pulse"
                                        : isApplied
                                          ? "bg-emerald-600 text-white"
                                          : isPending
                                            ? "bg-amber-500 text-white"
                                            : isFuture
                                              ? "bg-blue-500 text-white"
                                              : "bg-gray-400 text-white"
                                    }`}>
                                      {isOverdue 
                                        ? "🚨 Atrasada!" 
                                        : isApplied 
                                          ? "✓ Aplicada" 
                                          : isPending 
                                            ? "⏳ Aplicar Hoje" 
                                            : isFuture 
                                              ? "📅 Futura" 
                                              : "❌ Prazo Expirado"
                                      }
                                    </span>
                                  </div>

                                  <div className="text-xs text-gray-600 mt-1 font-medium leading-relaxed max-w-2xl">
                                    {reco.observations}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100/75 justify-end">
                                  {isApplied ? (
                                    <span className="text-3xs font-black text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                                      Salvo na Carteira
                                    </span>
                                  ) : isExpired ? (
                                    <span className="text-3xs font-bold text-gray-400 italic">
                                      Fora do limite rígido do SUS
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handlePrefillAddForm(reco)}
                                        className="py-1.5 px-2 bg-white text-blue-600 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                        title="Registrar manualmente com lote, data de aplicação etc."
                                      >
                                        Adicionar Info
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleAutoRegisterRecommendation(reco, "applied")}
                                        className="py-1.5 px-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                        title="Marcar vacina como tomada hoje rapidamente"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                        Tomada Hoje
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* List Custom Booklet Vaccines (O histórico da carteira) */
              memberVaccines.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Syringe className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600">Nenhuma vacina manual registrada</p>
                  <p className="text-xs bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 mt-2 text-gray-500">Mantenha o histórico sanitário personalizado sempre atualizado!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberVaccines.map((item) => {
                    const isOverdue = item.status === "overdue" || (item.status === "pending" && item.dueDate && item.dueDate < todayStr);
                    const isPending = item.status === "pending" && (!item.dueDate || item.dueDate >= todayStr);
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left ${
                          isOverdue 
                            ? "border-red-200 bg-red-50/20" 
                            : isPending 
                              ? "border-amber-100 bg-yellow-50/10" 
                              : "border-gray-100 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="font-extrabold text-gray-900 text-sm leading-tight">{item.name}</h4>
                            <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded ${
                              isOverdue 
                                ? "bg-red-500 text-white animate-pulse" 
                                : isPending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {item.status === "applied" ? "Aplicada / Ok" : isOverdue ? "Atrasada!" : "Pendente"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-semibold">
                            <span>Dose: {item.dose}</span>
                            {item.appliedDate && <span>Aferido em: <strong className="text-gray-700 font-bold">{formatDate(item.appliedDate)}</strong></span>}
                            {item.dueDate && <span>Vencimento do Prazo: <strong className={isOverdue ? "text-red-600" : "text-gray-700"}>{formatDate(item.dueDate)}</strong></span>}
                            {item.batch && <span className="text-2xs bg-gray-100 px-2 rounded font-mono">Lote: {item.batch}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 justify-end">
                          {(isPending || isOverdue) && (
                            <button
                              type="button"
                              id={`btn-apply-vaccine-${item.id}`}
                              onClick={() => handleToggleVaccineApplied(item)}
                              className="py-1.5 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100 transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Aplicar Hoje
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditVaccine(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 bg-white hover:text-blue-700 border border-slate-200/55 rounded transition-colors cursor-pointer"
                            title="Editar vacina"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* 2.5. Surgeries Tab Screen */}
        {activeTab === "surgeries" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Histórico Cirúrgico</h3>
                <p className="text-xs text-gray-500">Procedimentos pós-operatórios, cirurgias e intervenções clínicas</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSurgery(!showAddSurgery)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Cirurgia
              </button>
            </div>

            {showAddSurgery && (
              <form onSubmit={handleAddSurgery} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left animate-in slide-in-from-top-4 duration-205">
                <h4 className="font-bold text-sm text-gray-800">Nova Cirurgia / Procedimento</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Procedimento ou Cirurgia</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Correção de Estrabismo, Desvio de Septo"
                      value={surgeryForm.title}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, title: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Especialidade Médica</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Oftalmologia, Ortopedia"
                      value={surgeryForm.specialty}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, specialty: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data do Procedimento</label>
                    <input
                      type="date"
                      required
                      value={surgeryForm.date}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, date: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Cirurgião Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Dr. Rintaro"
                      value={surgeryForm.doctor}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, doctor: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Hospital / Unidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Hospital Sadalla Amin"
                      value={surgeryForm.facility}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, facility: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Recomendações / Prescrição Pós-Operatória</label>
                    <textarea
                      placeholder="Medicamentos de uso temporário, repouso, curativos..."
                      value={surgeryForm.prescription}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, prescription: e.target.value })}
                      rows={3}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Anotações Gerais / Evolução</label>
                    <textarea
                      placeholder="Notas adicionais sobre a cirurgia ou recuperação..."
                      value={surgeryForm.notes}
                      onChange={(e) => setSurgeryForm({ ...surgeryForm, notes: e.target.value })}
                      rows={3}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 font-bold hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Procedimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSurgery(false)}
                    className="py-2 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* List Surgeries */}
            {memberSurgeries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Nenhuma cirurgia registrada</p>
                <p className="text-xs bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 mt-2 text-gray-500 font-semibold">Adicione intervenções cirúrgicas para consolidar a ficha clínica.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberSurgeries.map((item) => {
                  return (
                    <div 
                      key={item.id} 
                      className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 relative text-left transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleStartEditSurgery(item)}
                        className="absolute right-4 top-4 p-1.5 text-blue-600 hover:bg-blue-50 bg-white hover:text-blue-700 border border-slate-200/55 rounded transition-colors cursor-pointer"
                        title="Editar cirurgia"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-md border border-pink-100">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-xxs font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Intervenção Cirúrgica
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase">Procedimento</span>
                          <h4 className="font-extrabold text-gray-800 text-base">{item.reason || "Cirurgia Geral"}</h4>
                          <p className="text-xs text-gray-700 mt-0.5 font-bold">Especialidade: {item.specialty.replace(" (Cirurgia)", "")}</p>
                          {item.doctor && <p className="text-xs text-gray-500 mt-0.5 font-medium">Equipe: {item.doctor}</p>}
                          {item.facility && <p className="text-2xs text-gray-400 font-medium">{item.facility}</p>}
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Recomendações e Pós-Operatório</span>
                          <p className="text-xs text-slate-705 text-slate-700 font-medium mt-1 leading-relaxed whitespace-pre-line bg-amber-50/20 border border-amber-100/50 p-2.5 rounded-xl">
                            {item.prescription || "Nenhum cuidado especial detalhado."}
                          </p>
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Anotações / Evolução Clínica</span>
                          <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium mt-1 leading-relaxed whitespace-pre-line">
                            {item.notes || "Sem notas adicionais cadastradas."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2.6. Hospitalizations Tab Screen */}
        {activeTab === "hospitalizations" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Histórico de Internações</h3>
                <p className="text-xs text-gray-500">Admissão hospitalar, pronto-socorro prolongado e altas clínicas</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddHospitalization(!showAddHospitalization)}
                className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Internação
              </button>
            </div>

            {showAddHospitalization && (
              <form onSubmit={handleAddHospitalization} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-2 space-y-4 text-left animate-in slide-in-from-top-4 duration-205">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                  <h4 className="font-bold text-sm text-gray-850">Nova Internação Hospitalar</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Admissão (Entrada)</label>
                    <input
                      type="date"
                      required
                      value={hospitalForm.date}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, date: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Alta (Opcional)</label>
                    <input
                      type="date"
                      value={hospitalForm.dischargeDate}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, dischargeDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Hospital / Instituição</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Hospital Municipal, Santa Casa"
                      value={hospitalForm.facility}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, facility: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Responsável (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Dr. Marcelo Ramos"
                      value={hospitalForm.doctor}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, doctor: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Motivo da Internação / Queixa Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Apendicite aguda, Complicações respiratórias, Crise hipertensiva"
                    value={hospitalForm.reason}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, reason: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Diagnóstico Clínico (CID principal / Detalhes)</label>
                  <input
                    type="text"
                    placeholder="Ex: Apendicite Aguda Supurativa K35.3"
                    value={hospitalForm.diagnosis}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, diagnosis: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Tratamentos / Medicamentos Administrados</label>
                  <textarea
                    placeholder="Ex: Soro fisiológico, Antibioticoterapia endovenosa, Monitorização"
                    value={hospitalForm.prescription}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, prescription: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Anotações Gerais / Recomendações pós-alta</label>
                  <textarea
                    placeholder="Ex: Evitar carregar peso por 15 dias, repouso físico..."
                    value={hospitalForm.notes}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, notes: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Adicionar Internação
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddHospitalization(false)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* List Hospitalizations */}
            {memberHospitalizations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Hospital className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Nenhuma internação registrada</p>
                <p className="text-xs bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 mt-2 text-gray-500 font-semibold">Adicione registros de internação caso o paciente tenha sido hospitalizado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberHospitalizations.map((item) => {
                  const isStillAdmitted = !item.dischargeDate;
                  return (
                    <div 
                      key={item.id} 
                      className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 relative text-left transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleStartEditHospitalization(item)}
                        className="absolute right-4 top-4 p-1.5 text-blue-600 hover:bg-blue-50 bg-white hover:text-blue-700 border border-slate-200/55 rounded transition-colors cursor-pointer"
                        title="Editar internação"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                          Entrada: {formatDate(item.date)}
                        </span>
                        {isStillAdmitted ? (
                          <span className="text-xxs font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            Internado Atualmente
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                            Alta: {formatDate(item.dischargeDate)}
                          </span>
                        )}
                        <span className="text-xxs font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Internação Hospitalar
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase">Diagnóstico / Motivo</span>
                          <h4 className="font-extrabold text-gray-800 text-base">{item.reason || "Internação Geral"}</h4>
                          {item.diagnosis && <p className="text-xs text-indigo-650 mt-1 font-bold">Diagnóstico: {item.diagnosis}</p>}
                          {item.doctor && <p className="text-xs text-gray-500 mt-0.5 font-medium">Médico Responsável: {item.doctor}</p>}
                          {item.facility && <p className="text-2xs text-gray-400 font-medium mt-1">{item.facility}</p>}
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Tratamentos / Prescrições</span>
                          <p className="text-xs text-slate-705 text-slate-700 font-medium mt-1 leading-relaxed whitespace-pre-line bg-blue-50/20 border border-blue-100/50 p-2.5 rounded-xl">
                            {item.prescription || "Monitoramento continuado e repouso clínico."}
                          </p>
                        </div>

                        <div>
                          <span className="text-2xs font-extrabold text-gray-400 uppercase block">Recomendações e Alta</span>
                          <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium mt-1 leading-relaxed whitespace-pre-line">
                            {item.notes || "Sem observações adicionais gravadas."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal Dialog */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-155 p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Ficha do Prontuário
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditProfileModal(false);
                  setConfirmDeleteId(null);
                }}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Parentesco</label>
                  <input
                    type="text"
                    required
                    value={profileForm.relationship}
                    onChange={(e) => setProfileForm({ ...profileForm, relationship: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={profileForm.birthDate}
                    onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Tipo Sanguíneo</label>
                  <select
                    value={profileForm.bloodType}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Não Informado</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Alergias</label>
                <textarea
                  placeholder="Ex: Nenhuma, Penicilina, Corante Amarelo Tartrazina"
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Comorbidades / Condições Crônicas</label>
                <textarea
                  placeholder="Ex: Nenhuma, Asma, Hipertensão, Diabetes Tipo 1"
                  value={profileForm.comorbidities}
                  onChange={(e) => setProfileForm({ ...profileForm, comorbidities: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Medicamentos em Uso (Uso Contínuo)</label>
                <textarea
                  placeholder="Ex: Nenhum, Cloridrato de Sertralina 50mg (1x ao dia pela manhã)"
                  value={profileForm.medications}
                  onChange={(e) => setProfileForm({ ...profileForm, medications: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Atividade Física Regular</label>
                <textarea
                  placeholder="Ex: Nenhuma, Musculação 3x por semana, Corrida leve nos finais de semana"
                  value={profileForm.physicalActivity}
                  onChange={(e) => setProfileForm({ ...profileForm, physicalActivity: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Antecedentes Familiares</label>
                <textarea
                  placeholder="Ex: Hipertensão (pai, avô materno), Câncer de mama (tia materna)"
                  value={profileForm.familyHistory}
                  onChange={(e) => setProfileForm({ ...profileForm, familyHistory: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-between items-center pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-150 flex items-center gap-1 cursor-pointer active:scale-95 ${
                    confirmDeleteId === member.id
                      ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                      : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {confirmDeleteId === member.id ? "Confirmar Exclusão?" : "Excluir Integrante"}
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    id="btn-save-member-edit-profile"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProfileModal(false);
                      setConfirmDeleteId(null);
                    }}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100 active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vital Modal Dialog */}
      {editingVital && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Sinais Vitais / Aferição
              </h3>
              <button
                type="button"
                onClick={() => setEditingVital(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitalEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data da Aferição</label>
                  <input
                    type="date"
                    required
                    value={editVitalForm.date}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 75.5"
                    value={editVitalForm.weight}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, weight: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Glicemia (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="Ex: 92"
                    value={editVitalForm.glucose}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, glucose: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">P.A. Sistólica (Máx)</label>
                  <input
                    type="number"
                    placeholder="Ex: 120"
                    value={editVitalForm.sys}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, sys: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">P.A. Diastólica (Mín)</label>
                  <input
                    type="number"
                    placeholder="Ex: 80"
                    value={editVitalForm.dia}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, dia: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Batimentos (bpm)</label>
                  <input
                    type="number"
                    placeholder="Ex: 72"
                    value={editVitalForm.hr}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, hr: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 154.5"
                    value={editVitalForm.height}
                    onChange={(e) => setEditVitalForm({ ...editVitalForm, height: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingVital) {
                      setEditingVital(null);
                      await handleDeleteItem("vitals", editingVital.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Registro
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVital(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Consultation Modal Dialog */}
      {editingConsultation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Consulta Médica
              </h3>
              <button
                type="button"
                onClick={() => setEditingConsultation(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultationEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data da Consulta</label>
                  <input
                    type="date"
                    required
                    value={editConsultForm.date}
                    onChange={(e) => setEditConsultForm({ ...editConsultForm, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Especialidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pediatria, Cardiologia"
                    value={editConsultForm.specialty}
                    onChange={(e) => setEditConsultForm({ ...editConsultForm, specialty: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Responsável (CRM)</label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Nelson Araujo"
                    value={editConsultForm.doctor}
                    onChange={(e) => setEditConsultForm({ ...editConsultForm, doctor: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Hospital / Clínica / Local</label>
                  <input
                    type="text"
                    placeholder="Ex: Hospital Albert Einstein"
                    value={editConsultForm.facility}
                    onChange={(e) => setEditConsultForm({ ...editConsultForm, facility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Motivo do Atendimento / Sintomas</label>
                <input
                  type="text"
                  placeholder="Ex: Check-up de rotina, febre de 38ºC à noite"
                  value={editConsultForm.reason}
                  onChange={(e) => setEditConsultForm({ ...editConsultForm, reason: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Prescrição Médica (Receitas, Dosagens)</label>
                <textarea
                  placeholder="Ex: Paracetamol 500mg de 8h em 8h se febre persistir."
                  value={editConsultForm.prescription}
                  onChange={(e) => setEditConsultForm({ ...editConsultForm, prescription: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Anotações Gerais / Recomendações</label>
                <textarea
                  placeholder="Ex: Retornar em 15 dias com resultados de exames de sangue."
                  value={editConsultForm.notes}
                  onChange={(e) => setEditConsultForm({ ...editConsultForm, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingConsultation) {
                      setEditingConsultation(null);
                      await handleDeleteItem("consultations", editingConsultation.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Registro
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingConsultation(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Surgery Modal Dialog */}
      {editingSurgery && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 flex flex-col text-left">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Procedimento Cirúrgico
              </h3>
              <button
                type="button"
                onClick={() => setEditingSurgery(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSurgeryEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data do Procedimento</label>
                  <input
                    type="date"
                    required
                    value={editSurgeryForm.date}
                    onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Especialidade Cirúrgica</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Geral, Ortopedia, Oftalmologia"
                    value={editSurgeryForm.specialty}
                    onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, specialty: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Cirurgião / CRM</label>
                  <input
                    type="text"
                    placeholder="Ex: Dra. Eliana Silva"
                    value={editSurgeryForm.doctor}
                    onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, doctor: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Hospital / Clínica</label>
                  <input
                    type="text"
                    placeholder="Ex: Hospital Samaritano"
                    value={editSurgeryForm.facility}
                    onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, facility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Procedimento / Motivo (Título)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Apendicectomia, Correção de Miopia"
                  value={editSurgeryForm.title}
                  onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, title: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Tratamento Pós-Operatório / Receitas</label>
                <textarea
                  placeholder="Ex: Repouso por 7 dias, Analgésico se dor."
                  value={editSurgeryForm.prescription}
                  onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, prescription: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Anotações Gerais / Recomendações</label>
                <textarea
                  placeholder="Ex: Retorno cirúrgico em 10 dias para retirada de pontos."
                  value={editSurgeryForm.notes}
                  onChange={(e) => setEditSurgeryForm({ ...editSurgeryForm, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingSurgery) {
                      setEditingSurgery(null);
                      await handleDeleteItem("consultations", editingSurgery.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Registro
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSurgery(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospitalization Modal Dialog */}
      {editingHospitalization && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-155 p-6 flex flex-col text-left">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Registro de Internação
              </h3>
              <button
                type="button"
                onClick={() => setEditingHospitalization(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHospitalizationEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Admissão (Entrada)</label>
                  <input
                    type="date"
                    required
                    value={editHospitalForm.date}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data de Alta (Opcional)</label>
                  <input
                    type="date"
                    value={editHospitalForm.dischargeDate}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, dischargeDate: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Hospital / Instituição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hospital Municipal"
                    value={editHospitalForm.facility}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, facility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Responsável (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Marcelo Ramos"
                    value={editHospitalForm.doctor}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, doctor: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Motivo da Internação / Queixa Principal</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Apendicite aguda, Crise hipertensiva"
                  value={editHospitalForm.reason}
                  onChange={(e) => setEditHospitalForm({ ...editHospitalForm, reason: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Diagnóstico Clínico (CID/Detalhes)</label>
                <input
                  type="text"
                  placeholder="Ex: Apendicite Aguda Supurativa K35.3"
                  value={editHospitalForm.diagnosis}
                  onChange={(e) => setEditHospitalForm({ ...editHospitalForm, diagnosis: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Tratamentos / Medicamentos Administrados</label>
                <textarea
                  placeholder="Ex: Cirurgia de apendicectomia por laparoscopia, antibióticos IV"
                  value={editHospitalForm.prescription}
                  onChange={(e) => setEditHospitalForm({ ...editHospitalForm, prescription: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1">Anotações Gerais / Recomendações pós-alta</label>
                <textarea
                  placeholder="Ex: Evitar esforços por 30 dias, retorno clínico..."
                  value={editHospitalForm.notes}
                  onChange={(e) => setEditHospitalForm({ ...editHospitalForm, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingHospitalization) {
                      setEditingHospitalization(null);
                      await handleDeleteItem("consultations", editingHospitalization.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50 animate-in duration-75"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Registro
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHospitalization(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal Dialog */}
      {editingExam && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 flex flex-col text-left">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Exame Clínico
              </h3>
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExamEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Data do Exame</label>
                  <input
                    type="date"
                    required
                    value={editExamForm.date}
                    onChange={(e) => setEditExamForm({ ...editExamForm, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Nome do Exame</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hemograma Completo, Raio-X de Tórax"
                    value={editExamForm.title}
                    onChange={(e) => setEditExamForm({ ...editExamForm, title: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-gray-600 mb-1 font-semibold">Categoria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sangue, Imagem, Urina"
                    value={editExamForm.category}
                    onChange={(e) => setEditExamForm({ ...editExamForm, category: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-gray-600 mb-1 font-semibold">Laboratório / Local</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laboratório Fleury"
                    value={editExamForm.facility}
                    onChange={(e) => setEditExamForm({ ...editExamForm, facility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Médico Solicitante</label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Nelson Araujo"
                    value={editExamForm.doctor}
                    onChange={(e) => setEditExamForm({ ...editExamForm, doctor: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-1 font-semibold">Resultados / Observações do Laudo</label>
                <textarea
                  placeholder="Ex: Colesterol LDL: 110 mg/dL, glicemia normal..."
                  value={editExamForm.observations}
                  onChange={(e) => setEditExamForm({ ...editExamForm, observations: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingExam) {
                      setEditingExam(null);
                      await handleDeleteItem("exams", editingExam.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Registro
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vaccine Modal Dialog */}
      {editingVaccine && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 flex flex-col text-left">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 select-none">
              <h3 className="text-lg font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Histórico de Vacina
              </h3>
              <button
                type="button"
                onClick={() => setEditingVaccine(null)}
                className="p-1 px-1.5 hover:bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVaccineEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Nome da Vacina</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tríplice Viral, Pfizer Bivalente"
                    value={editVaccineForm.name}
                    onChange={(e) => setEditVaccineForm({ ...editVaccineForm, name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Dose</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1ª Dose, Reforço Anual"
                    value={editVaccineForm.dose}
                    onChange={(e) => setEditVaccineForm({ ...editVaccineForm, dose: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 mb-2">Situação da Vacina</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVaccineForm({ ...editVaccineForm, status: "applied" })}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      editVaccineForm.status === "applied"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ✅ Aplicada
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVaccineForm({ ...editVaccineForm, status: "pending" })}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      editVaccineForm.status !== "applied"
                        ? "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ⏳ Agendada (Pendente)
                  </button>
                </div>
              </div>

              {editVaccineForm.status === "applied" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-1 duration-150">
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Data da Aplicação</label>
                    <input
                      type="date"
                      required
                      value={editVaccineForm.appliedDate}
                      onChange={(e) => setEditVaccineForm({ ...editVaccineForm, appliedDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-gray-600 mb-1">Lote / Fabricante</label>
                    <input
                      type="text"
                      placeholder="Ex: B7281A"
                      value={editVaccineForm.batch}
                      onChange={(e) => setEditVaccineForm({ ...editVaccineForm, batch: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-2xs font-bold text-gray-600 mb-1">Previsão da Dose / Data Limite</label>
                  <input
                    type="date"
                    required
                    value={editVaccineForm.dueDate}
                    onChange={(e) => setEditVaccineForm({ ...editVaccineForm, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingVaccine) {
                      setEditingVaccine(null);
                      await handleDeleteItem("vaccines", editingVaccine.id);
                    }
                  }}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Vacina
                </button>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVaccine(null)}
                    className="py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Resolution Photo Viewer Modal */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
            <button
              type="button"
              className="absolute right-4 top-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors font-bold text-sm cursor-pointer"
              onClick={() => setViewingPhotoUrl(null)}
            >
              <X className="w-5 h-5 shadow-3xs" />
            </button>
            <h3 className="font-bold text-gray-800 mb-4 inline-flex items-center gap-1.5 text-sm select-none">
              <Clipboard className="w-4 h-4 text-blue-500" />
              Laudo Físico do Exame Anexado
            </h3>
            <div className="overflow-auto w-full max-h-[500px] flex flex-col items-center justify-center">
              {viewingPhotoUrl.startsWith("data:application/pdf") ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center text-center">
                    <FileText className="w-16 h-16 text-rose-500 mb-2 animate-pulse" />
                    <span className="text-xs font-black text-slate-800">Documento em formato PDF</span>
                    <p className="text-3xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Para melhor visualização no celular ou para salvar o laudo completo, use uma das opções abaixo.
                    </p>
                  </div>
                  
                  {/* Desktop view iframe, hidden on small screens */}
                  <div className="hidden sm:block w-full h-[320px] border border-slate-200 rounded-xl overflow-hidden mt-1">
                    <iframe
                      src={viewingPhotoUrl}
                      title="Visualizador de PDF Exame"
                      className="w-full h-full"
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="w-full flex flex-col sm:flex-row gap-2 mt-1">
                    <a
                      href={viewingPhotoUrl}
                      download={`exame-${(member.name || member.relationship || "paciente").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Arquivo PDF
                    </a>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newTab = window.open();
                        if (newTab) {
                          newTab.document.write(`<iframe src="${viewingPhotoUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        }
                      }}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visualizar em Tela Cheia
                    </button>
                  </div>
                </div>
              ) : (
                <img 
                  referrerPolicy="no-referrer"
                  src={viewingPhotoUrl} 
                  alt="Documento ampliado" 
                  className="max-w-full object-contain max-h-[460px] rounded-lg shadow-sm border border-gray-100"
                />
              )}
            </div>
            <p className="text-2xs text-gray-500 mt-4 leading-normal text-center select-none">Este documento está guardado com total segurança no banco offline do seu celular.</p>
          </div>
        </div>
      )}

      {/* Spreadsheet Import Drawer Dialog Modal overlay */}
      <SpreadsheetImporter
        member={member}
        isOpen={showSpreadsheetImport}
        onClose={() => setShowSpreadsheetImport(false)}
        onDataImported={onDataChanged}
      />

      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6 flex flex-col text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 mb-4 text-red-600 border border-red-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <h3 className="text-base font-black text-gray-900 mb-1">
              Confirmar Exclusão
            </h3>
            
            <p className="text-xs text-gray-500 font-semibold leading-relaxed mb-6">
              Tem certeza que deseja remover este registro? Esta ação é irreversível e apagará permanentemente esses dados.
            </p>
            
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { dbService } = await import("../lib/db.ts");
                    const { storeName, id } = itemToDelete;
                    if (storeName === "consultations") await dbService.deleteConsultation(id);
                    if (storeName === "exams") await dbService.deleteExam(id);
                    if (storeName === "vaccines") await dbService.deleteVaccine(id);
                    if (storeName === "vitals") await dbService.deleteVital(id);
                    
                    setItemToDelete(null);
                    onDataChanged();
                  } catch (err) {
                    setErrorText("Falha ao deletar informação.");
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                Sim, Remover
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-white text-gray-600 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

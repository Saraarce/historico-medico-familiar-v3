import { FamilyMember, Consultation, Exam, HealthVital, Vaccine } from "../types";

const DB_NAME = "FamilyMedicalDB";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Erro ao abrir banco de dados local IndexedDB."));
    };

    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("members")) {
        db.createObjectStore("members", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("consultations")) {
        db.createObjectStore("consultations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("exams")) {
        db.createObjectStore("exams", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("vitals")) {
        db.createObjectStore("vitals", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("vaccines")) {
        db.createObjectStore("vaccines", { keyPath: "id" });
      }
    };
  });
}

// Low-level helper to execute a transaction
function runTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      tx.oncomplete = () => {
        resolve(request.result as T);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  });
}

function updateLocalTimestamp() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("clinical_last_update", new Date().toISOString());
  }
}

export const dbService = {
  setLocalLastUpdate(isoString?: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("clinical_last_update", isoString || new Date().toISOString());
    }
  },
  getLocalLastUpdate(): string | null {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("clinical_last_update");
    }
    return null;
  },
  setActiveDriveFile(id: string, name: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("active_google_drive_file_id", id);
      window.localStorage.setItem("active_google_drive_file_name", name);
    }
  },
  getActiveDriveFile(): { id: string; name: string } | null {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("active_google_drive_file_id");
      const name = window.localStorage.getItem("active_google_drive_file_name");
      if (id && name) {
        return { id, name };
      }
    }
    return null;
  },
  clearActiveDriveFile() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("active_google_drive_file_id");
      window.localStorage.removeItem("active_google_drive_file_name");
    }
  },

  // Clear all existing mock data tables
  clearAllData(): Promise<void> {
    const stores = ["members", "consultations", "exams", "vitals", "vaccines"];
    return initDB().then((db) => {
      const tx = db.transaction(stores, "readwrite");
      stores.forEach((storeName) => {
        tx.objectStore(storeName).clear();
      });
      return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          updateLocalTimestamp();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    });
  },

  // Seed the system with the spreadsheet dataset
  seedNewData(): Promise<FamilyMember[]> {
    const defaultMembers: FamilyMember[] = [
      { id: "eu_primary", name: "", relationship: "EU", birthDate: "", bloodType: "", allergies: "", avatarColor: "bg-purple-500", comorbidities: "", medications: "" }
    ];

    const defaultConsultations: Consultation[] = [];
    const defaultExams: Exam[] = [];
    const defaultVitals: HealthVital[] = [];
    const defaultVaccines: Vaccine[] = [];

    // Bulk save in parallel with low-level tx
    return Promise.all([
      ...defaultMembers.map((m) => this.saveMember(m)),
      ...defaultConsultations.map((c) => this.saveConsultation(c)),
      ...defaultExams.map((e) => this.saveExam(e)),
      ...defaultVitals.map((v) => this.saveVital(v)),
      ...defaultVaccines.map((v) => this.saveVaccine(v))
    ]).then(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("has_seeded_v3", "true");
        window.localStorage.setItem("has_seeded_v2", "true");
      }
      return defaultMembers;
    });
  },

  getMembers(): Promise<FamilyMember[]> {
    return runTx<FamilyMember[]>("members", "readonly", (store) => store.getAll()).then(async (list) => {
      const hasOldData = list.some(
        (m) =>
          m.id === "member_1" ||
          m.name === "Carlos Silva" ||
          m.name === "Ana Silva" ||
          m.id === "isaac" ||
          m.id === "matheus" ||
          m.id === "samuel"
      );
      const isSeededV3 = typeof window !== "undefined" && window.localStorage.getItem("has_seeded_v3") === "true";

      if (hasOldData) {
        return this.clearAllData().then(() => this.seedNewData());
      }

      // If already seeded V2 but not V3, migrate "mae_primary" to "eu_primary" safely
      if (!isSeededV3 && typeof window !== "undefined") {
        const hasV2 = window.localStorage.getItem("has_seeded_v2") === "true";
        if (hasV2) {
          try {
            const maeIndex = list.findIndex((m) => m.id === "mae_primary");
            if (maeIndex !== -1) {
              const maeMember = list[maeIndex];
              const euMember: FamilyMember = {
                ...maeMember,
                id: "eu_primary",
                relationship: maeMember.relationship === "Mãe" ? "EU" : maeMember.relationship,
              };

              // 1. Save new "eu_primary"
              await this.saveMember(euMember);

              // 2. Delete old "mae_primary"
              await this.deleteMember("mae_primary");

              // 3. Migrate other data linked to mae_primary to eu_primary
              const consults = await this.getConsultations();
              for (const c of consults) {
                if (c.memberId === "mae_primary") {
                  await this.saveConsultation({ ...c, memberId: "eu_primary" });
                }
              }

              const exams = await this.getExams();
              for (const e of exams) {
                if (e.memberId === "mae_primary") {
                  await this.saveExam({ ...e, memberId: "eu_primary" });
                }
              }

              const vitals = await this.getVitals();
              for (const v of vitals) {
                if (v.memberId === "mae_primary") {
                  await this.saveVital({ ...v, memberId: "eu_primary" });
                }
              }

              const vaccines = await this.getVaccines();
              for (const v of vaccines) {
                if (v.memberId === "mae_primary") {
                  await this.saveVaccine({ ...v, memberId: "eu_primary" });
                }
              }

              // Update in-memory returned list
              list.splice(maeIndex, 1, euMember);
            }
            window.localStorage.setItem("has_seeded_v3", "true");
          } catch (err) {
            console.error("Erro durante a migração para a V3:", err);
          }
        } else {
          return this.clearAllData().then(() => this.seedNewData());
        }
      }

      if (list.length === 0) {
        if (typeof window !== "undefined" && window.localStorage.getItem("has_seeded_v3") === "true") {
          return [];
        }
        return this.seedNewData();
      }
      return list;
    });
  },

  saveMember(member: FamilyMember): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("members", "readwrite", (store) => store.put(member));
  },

  deleteMember(id: string): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("members", "readwrite", (store) => store.delete(id));
  },

  // Consultations
  getConsultations(): Promise<Consultation[]> {
    return runTx<Consultation[]>("consultations", "readonly", (store) => store.getAll());
  },

  saveConsultation(consultation: Consultation): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("consultations", "readwrite", (store) => store.put(consultation));
  },

  deleteConsultation(id: string): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("consultations", "readwrite", (store) => store.delete(id));
  },

  // Exams
  getExams(): Promise<Exam[]> {
    return runTx<Exam[]>("exams", "readonly", (store) => store.getAll());
  },

  saveExam(exam: Exam): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("exams", "readwrite", (store) => store.put(exam));
  },

  deleteExam(id: string): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("exams", "readwrite", (store) => store.delete(id));
  },

  // Health Vitals (Tracking data for charts)
  getVitals(): Promise<HealthVital[]> {
    return runTx<HealthVital[]>("vitals", "readonly", (store) => store.getAll());
  },

  saveVital(vital: HealthVital): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("vitals", "readwrite", (store) => store.put(vital));
  },

  deleteVital(id: string): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("vitals", "readwrite", (store) => store.delete(id));
  },

  // Vaccines
  getVaccines(): Promise<Vaccine[]> {
    return runTx<Vaccine[]>("vaccines", "readonly", (store) => store.getAll());
  },

  saveVaccine(vaccine: Vaccine): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("vaccines", "readwrite", (store) => store.put(vaccine));
  },

  deleteVaccine(id: string): Promise<void> {
    updateLocalTimestamp();
    return runTx<void>("vaccines", "readwrite", (store) => store.delete(id));
  }
};

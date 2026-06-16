import { dbService } from "./db";
import { FamilyMember, Consultation, Exam, HealthVital, Vaccine } from "../types";

export interface BackupData {
  version: number;
  exportedAt: string;
  members?: FamilyMember[];
  consultations?: Consultation[];
  exams?: Exam[];
  vitals?: HealthVital[];
  vaccines?: Vaccine[];
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

export const backupService = {
  /**
   * Fetches the list of JSON backups on the user's Google Drive.
   */
  async fetchBackupList(token: string): Promise<DriveFile[]> {
    console.log("[backupService] Buscando arquivos de backup no Drive...");
    const q = encodeURIComponent("(name contains '.json' or mimeType = 'application/json') and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=30`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "N/A");
      throw new Error(`Erro de rede ao recuperar backups (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  },

  /**
   * Downloads and parses a backup file from Google Drive.
   */
  async downloadBackup(token: string, fileId: string): Promise<BackupData> {
    console.log(`[backupService] Realizando download do backup ID ${fileId}...`);
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "N/A");
      throw new Error(`Erro ao baixar arquivo do Drive (${res.status}): ${errText}`);
    }

    const backup = await res.json();
    if (!backup || typeof backup !== "object") {
      throw new Error("O conteúdo do backup baixado não é um objeto JSON válido.");
    }
    return backup;
  },

  /**
   * Restores a BackupData object into IndexedDB.
   */
  async restoreBackupData(backup: BackupData, mode: "merge" | "replace", fallbackTime?: string): Promise<{
    membersCount: number;
    consultationsCount: number;
    examsCount: number;
  }> {
    const membersList = backup.members || [];
    const consultationsList = backup.consultations || [];
    const examsList = backup.exams || [];
    const vitalsList = backup.vitals || [];
    const vaccinesList = backup.vaccines || [];

    if (
      membersList.length === 0 &&
      consultationsList.length === 0 &&
      examsList.length === 0 &&
      vitalsList.length === 0 &&
      vaccinesList.length === 0
    ) {
      throw new Error("O backup fornecido não possui registros clínicos válidos.");
    }

    if (mode === "replace") {
      console.log("[backupService] Substituindo todos os dados locais...");
      await dbService.clearAllData();
    }

    for (const m of membersList) {
      await dbService.saveMember(m);
    }
    for (const c of consultationsList) {
      await dbService.saveConsultation(c);
    }
    for (const ex of examsList) {
      await dbService.saveExam(ex);
    }
    for (const vt of vitalsList) {
      await dbService.saveVital(vt);
    }
    for (const vc of vaccinesList) {
      await dbService.saveVaccine(vc);
    }

    const lastUpdateTime = backup.exportedAt || fallbackTime || new Date().toISOString();
    dbService.setLocalLastUpdate(lastUpdateTime);

    return {
      membersCount: membersList.length,
      consultationsCount: consultationsList.length,
      examsCount: examsList.length,
    };
  },

  /**
   * Exports the entire IndexedDB data to a JSON backup on Google Drive.
   */
  async exportToDrive(token: string): Promise<DriveFile> {
    console.log("[backupService] Iniciando exportação para o Google Drive...");
    const [members, consultations, exams, vitals, vaccines] = await Promise.all([
      dbService.getMembers(),
      dbService.getConsultations(),
      dbService.getExams(),
      dbService.getVitals(),
      dbService.getVaccines(),
    ]);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      members,
      consultations,
      exams,
      vitals,
      vaccines
    };

    const fileContent = JSON.stringify(backup, null, 2);
    let existingFile: DriveFile | null = null;
    const activeFile = dbService.getActiveDriveFile();

    if (activeFile) {
      console.log(`[backupService] Arquivo ativo configurado: ${activeFile.id} (${activeFile.name})`);
      try {
        const checkUrl = `https://www.googleapis.com/drive/v3/files/${activeFile.id}?fields=id,name,modifiedTime,capabilities(canEdit)`;
        const checkRes = await fetch(checkUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (checkRes.ok) {
          const fileMeta = await checkRes.json();
          if (fileMeta.capabilities?.canEdit !== false) {
            existingFile = { id: fileMeta.id, name: fileMeta.name, modifiedTime: fileMeta.modifiedTime };
          }
        }
      } catch (e) {
        console.warn("[backupService] Falha ao verificar arquivo ativo:", e);
      }
    }

    if (!existingFile) {
      const searchName = activeFile?.name || "prontuario_familiar_backup.json";
      const q = encodeURIComponent(`name = '${searchName}' and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,capabilities(canEdit))&orderBy=modifiedTime desc`;
      const searchRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const foundFiles = searchData.files || [];
        const editableFile = foundFiles.find((f: any) => f.capabilities?.canEdit !== false);
        if (editableFile) {
          existingFile = { id: editableFile.id, name: editableFile.name, modifiedTime: editableFile.modifiedTime };
          dbService.setActiveDriveFile(existingFile.id, existingFile.name);
        }
      }
    }

    let res;
    if (existingFile) {
      const fileId = existingFile.id;
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      res = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: fileContent,
      });
    } else {
      const targetName = activeFile?.name || "prontuario_familiar_backup.json";
      const metadata = {
        name: targetName,
        mimeType: "application/json",
      };

      const boundary = "foo_bar_boundary";
      const multipartRequestBody =
        `--${boundary}\r\n` +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        "Content-Type: application/json\r\n\r\n" +
        fileContent +
        `\r\n--${boundary}--`;

      const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "N/A");
      throw new Error(`Falha no upload do backup para o Drive (${res.status}): ${errText}`);
    }

    const resJson = await res.json().catch(() => ({}));
    const committedFileId = resJson.id || (existingFile ? existingFile.id : "");
    const committedFileName = resJson.name || (existingFile ? existingFile.name : (activeFile?.name || "prontuario_familiar_backup.json"));
    
    if (committedFileId && committedFileName) {
      dbService.setActiveDriveFile(committedFileId, committedFileName);
    }

    return {
      id: committedFileId,
      name: committedFileName,
      modifiedTime: resJson.modifiedTime || new Date().toISOString()
    };
  }
};

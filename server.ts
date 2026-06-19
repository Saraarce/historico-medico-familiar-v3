import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high limit for base64 camera images from mobile
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Lazy initialize Gemini API Client server-side to prevent crash on startup if missing
  const getGoogleGenAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", apiKeyConfigured: !!process.env.GEMINI_API_KEY });
  });

  // Diagnostic endpoint for Gemini configuration (Vercel parity)
  app.get("/api/gemini-status", (req, res) => {
    const isConfigured = typeof process.env.GEMINI_API_KEY === "string" && process.env.GEMINI_API_KEY.trim().length > 0;
    res.json({ geminiConfigured: isConfigured });
  });

  // Endpoint to generate an AI summary for a family member
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { member, consultations, exams } = req.body;

      if (!member) {
        return res.status(400).json({ error: "Dados do membro da família não fornecidos." });
      }

      const ai = getGoogleGenAI();

      const formattedConsultations = (consultations || [])
        .map((c: any) => `- Data: ${c.date} | Especialidade: ${c.specialty} | Médico: ${c.doctor} | Local: ${c.facility} | Motivo: ${c.reason} | Medicamentos/Recomendações: ${c.prescription || "Nenhuma"} | Notas: ${c.notes || "Sem observações"}`)
        .join("\n");

      const formattedExams = (exams || [])
        .map((e: any) => `- Data: ${e.date} | Exame: ${e.title} | Categoria: ${e.category} | Clínica: ${e.facility} | Médico Solicitante: ${e.doctor} | Observações/Resultados: ${e.observations}`)
        .join("\n");

      const today = new Date();
      const formattedCurrentDate = today.toLocaleDateString("pt-BR");
      const currentYear = today.getFullYear();

      const getAge = (birthDateStr: string) => {
        if (!birthDateStr) return null;
        const birth = new Date(birthDateStr);
        if (isNaN(birth.getTime())) return null;
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      };

      const patientAge = getAge(member.birthDate);
      const ageString = patientAge !== null ? `${patientAge} anos` : "Não informada";

      const prompt = `Você é um médico especialista sênior em medicina de família e privacidade/comunidade.
Gere uma Apresentação de Caso Clínico / Resumo Evolutivo ultracondensado e de alta densidade técnica (usando terminologia médica formal, abreviações profissionais aceitas e formato markdown limpo) para o seguinte paciente:

DATA ATUAL DO SISTEMA (HOJE): ${formattedCurrentDate} (Ano: ${currentYear})
IMPORTANTE: Considere rigorosamente a data atual acima para referências temporais e evolução clínica. O paciente possui exatamente ${ageString} hoje.

Ficha e Identificação do Paciente:
- Nome: ${member.name}
- Parentesco: ${member.relationship}
- Data de Nascimento: ${member.birthDate} (Idade atual: ${ageString})
- Grupo Sanguíneo: ${member.bloodType}
- Alergias Documentadas: ${member.allergies || "Sem registro (Nenhuma)"}
- Comorbidades diagnosticadas: ${member.comorbidities || "Nenhuma comorbidade registrada"}
- Terapêutica de Uso Ativo/Contínuo: ${member.medications || "Nenhum medicamento de uso contínuo registrado"}

Histórico de Consultas Clínicas Recentes:
${formattedConsultations || "Nenhuma consulta registrada até o momento."}

Histórico de Exames Clínicos e Laudos Recentes:
${formattedExams || "Nenhum exame clínico registrado até o momento."}

Instruções Clínicas para o Resumo (OBRIGATÓRIO):
1. O resumo deve ser extremamente curto, resumido, direto e puramente técnico. O TOTAL de caracteres de todas as seções combinadas DEVERÁ ser menor que 500 caracteres.
2. ZERO EXTRAPOLAÇÃO E ZERO ALUCINAÇÃO: Não deduza, não adivinhe e não assuma novos sintomas, alergias, medicações ou patologias que não constem de forma literal nos dados do paciente acima. Baseie-se APENAS de forma 100% estrita nas informações fornecidas. Se não houver intercorrências registradas, descreva apenas "Paciente hígido" ou "Sem intercorrências documentadas".
3. Evite qualquer tipo de empatia ou linguagem calorosa. Vá direto ao ponto de forma ultra-concisa.
4. Estruture em Markdown limpo usando as seguintes seções curtas com siglas médicas oficiais (ex: HAS, DM):
   - **Sumário Clínico**: Status e histórico real sintetizados.
   - **Achados**: Pontos críticos reais dos exames ou consultas (se houver).
   - **Conduta**: Próximos passos declarados textualmente nos dados do paciente (ou apenas "Monitoramento de rotina" se nada constar).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um copiloto médico virtual altamente técnico, focado em extrema brevidade e precisão absoluta de fatos. Você nunca inventa informações e descreve estritamente o que foi computado. Suas avaliações são formuladas sob o tom de uma passagem de caso clínico de médico para médico. O total de caracteres combinados de todas as seções geradas jamais deve exceder 500 caracteres.",
          temperature: 0.1,
        }
      });

      const summaryText = response.text;
      if (!summaryText) {
        throw new Error("Resposta de resumo vazia do Gemini.");
      }

      return res.json({ summary: summaryText });
    } catch (error: any) {
      console.error("Erro ao gerar resumo de saúde com Gemini:", error);
      return res.status(500).json({
        error: "Falha ao gerar o resumo de saúde utilizando a Inteligência Artificial.",
        details: error.message || String(error),
      });
    }
  });

  // Endpoint to scan a medical exam photo using Gemini 3.5 Flash
  app.post("/api/scan-exam", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
      }

      const ai = getGoogleGenAI();

      // Universal regex to strip ANY base64 prefix safely (such as application/pdf or image/png)
      const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/\-+.]+;base64,/, "");
      const finalMimeType = mimeType || "image/jpeg";

      const prompt = `Analise esta imagem ou documento PDF de laudo médico, exame clínico, receita ou atestado. Extraia os detalhes clínicos relevantes em português e organize-os estruturadamente com base nos campos solicitados. Se algum campo original não estiver definido no documento, retorne uma string vazia ou use sua melhor inferência sensata de acordo com o contexto do laudo.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: finalMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          systemInstruction: "Você é um assistente médico especialista em transcrição e digitalização de prontuários. Seu trabalho é extrair de forma precisa e confidencial informações de exames, receitas ou atestados enviados por imagem.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "O nome legível ou tipo do exame/receita/documento, por exemplo: 'Hemograma Completo', 'Receita de Amoxicilina', 'Ultrassonografia Abdominal'.",
              },
              date: {
                type: Type.STRING,
                description: "Data de realização ou emissão no formato DD/MM/AAAA se especificada na imagem. Se não encontrar, tente deduzir ou deixe vazio.",
              },
              doctor: {
                type: Type.STRING,
                description: "Nome do médico, pediatra ou profissional de saúde responsável, se disponível.",
              },
              facility: {
                type: Type.STRING,
                description: "Clínica, hospital ou laboratório onde foi realizado (ex: 'Sabin', 'Fleury', 'Hospital Municipal').",
              },
              observations: {
                type: Type.STRING,
                description: "Resumo interpretativo sucinto dos resultados relevantes, valores de referência ou dosagens prescritas (máximo de 2 parágrafos).",
              },
              category: {
                type: Type.STRING,
                description: "Uma única palavra sugerindo a especialidade médica conveniente, ex: 'Cardiologia', 'Pediatria', 'Clínico Geral', 'Ginecologia', 'Ortopedia', 'Dermatologia', 'Outros'.",
              },
            },
            required: ["title", "date", "doctor", "facility", "observations", "category"],
          },
        },
      });

      let resultText = response.text;
      if (!resultText) {
        throw new Error("Resposta de extração vazia do Gemini.");
      }

      resultText = resultText.trim();
      if (resultText.startsWith("```")) {
        const match = resultText.match(/^(?:```json)?\s*([\s\S]*?)\s*```$/i);
        if (match) {
          resultText = match[1].trim();
        }
      }

      const extractedData = JSON.parse(resultText);
      return res.json(extractedData);
    } catch (error: any) {
      console.error("Erro ao analisar imagem com Gemini:", error);
      return res.status(500).json({
        error: "Falha ao analisar a imagem do exame utilizando a Inteligência Artificial.",
        details: error.message || String(error),
      });
    }
  });

  // Handle Vite Asset Serving configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

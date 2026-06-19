import { GoogleGenAI } from "@google/genai";

async function generateWithRetry(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config: any;
  }
) {
  const models = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.5-pro"
  ];
  let lastError: any = null;

  for (const model of models) {
    let attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[Gemini API] Tentativa ${attempt} de consultar o modelo "${model}"...`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        if (response && response.text) {
          console.log(`[Gemini API] Sucesso com o modelo "${model}" na tentativa ${attempt}!`);
          return response;
        }
        throw new Error("O modelo respondeu com conteúdo vazio.");
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err.message || err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("demand") ||
          errMsg.includes("temporary") ||
          errMsg.includes("limit") ||
          errMsg.includes("exhausted") ||
          errMsg.includes("429") ||
          errMsg.includes("ResourceExhausted") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("overloaded");

        if (isTransient) {
          console.warn(`[Gemini API] Modelo "${model}" indisponível temporariamente na tentativa ${attempt}. Erro: ${errMsg}`);
          if (attempt < attempts) {
            const delay = attempt * 1500; // 1500ms, 3000ms...
            console.log(`[Gemini API] Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } else {
          console.error(`[Gemini API] Erro não-passível de retry ou fatal com o modelo "${model}":`, errMsg);
          break; // Break attempt loop to proceed to the next model
        }
      }
    }
  }

  throw lastError || new Error("Todos os modelos Gemini alternativos falharam ao responder.");
}

export default async function handler(req: any, res: any) {
  // Only allow POST requests for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST." });
  }

  const startTime = Date.now();
  try {
    const { member, consultations, exams } = req.body;

    if (!member) {
      console.warn("[Gemini API] Requisição ignorada: Dados do membro da família ausentes.");
      return res.status(400).json({ error: "Dados do membro da família não fornecidos." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Gemini API] Falha de Configuração: GEMINI_API_KEY não encontrada no ambiente backend.");
      return res.status(500).json({
        error: "Chave de API do Gemini não configurada no servidor. Verifique as configurações no painel da Vercel.",
      });
    }

    console.log(`[Gemini API] Iniciando geração de Resumo Clínico Inteligente.`);
    console.log(`[Gemini API] Paciente: Parentesco="${member.relationship || "Não informado"}", Tipo Sanguíneo="${member.bloodType || "N/A"}", Comorbidades=${member.comorbidities ? "Sim" : "Não"}, MedicamentosAtivos=${member.medications ? "Sim" : "Não"}.`);
    console.log(`[Gemini API] Dados de Resumo: Consultas=${(consultations || []).length} registros, Exames=${(exams || []).length} registros.`);

    // Initialize Gemini API Client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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

    console.log(`[Gemini API] Solicitando geração de conteúdo com suporte a retry automático. Tamanho estimado do prompt: ${prompt.length} caracteres.`);

    const configObj = {
      systemInstruction: "Você é um copiloto médico virtual altamente técnico, focado em extrema brevidade e precisão absoluta de fatos. Você nunca inventa informações e descreve estritamente o que foi computado. Suas avaliações são formuladas sob o tom de uma passagem de caso clínico de médico para médico. O total de caracteres combinados de todas as seções geradas jamais deve exceder 500 caracteres.",
      temperature: 0.1,
    };

    const response = await generateWithRetry(ai, {
      contents: prompt,
      config: configObj,
    });

    const summaryText = response.text;
    if (!summaryText) {
      console.error("[Gemini API] Erro: O modelo respondeu com conteúdo vazio.");
      throw new Error("Resposta de resumo vazia do Gemini.");
    }

    const duration = Date.now() - startTime;
    console.log(`[Gemini API] Geração finalizada com sucesso em ${duration}ms! Tamanho do Resumo: ${summaryText.length} caracteres.`);

    return res.status(200).json({ summary: summaryText });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Gemini API] Falha grave ao gerar resumo clínico após ${duration}ms:`, error);
    return res.status(500).json({
      error: "Falha ao gerar o resumo de saúde utilizando a Inteligência Artificial.",
      details: error.message || String(error),
    });
  }
}

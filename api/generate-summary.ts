import { GoogleGenAI } from "@google/genai";

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

    const prompt = `Você é um médico especialista sênior em medicina de família e privacidade/comunidade.
Gere uma Apresentação de Caso Clínico / Resumo Evolutivo condensado e de alta densidade técnica (usando terminologia médica formal, abreviações profissionais aceitas e formato markdown limpo) para o seguinte paciente:

Ficha e Identificação do Paciente:
- Nome: ${member.name}
- Parentesco: ${member.relationship}
- Data de Nascimento: ${member.birthDate}
- Grupo Sanguíneo: ${member.bloodType}
- Alergias Documentadas: ${member.allergies || "Sem registro (Nenhuma)"}
- Comorbidades diagnosticadas: ${member.comorbidities || "Nenhuma comorbidade registrada"}
- Terapêutica de Uso Ativo/Contínuo: ${member.medications || "Nenhum medicamento de uso contínuo registrado"}

Histórico de Consultas Clínicas Recentes:
${formattedConsultations || "Nenhuma consulta registrada até o momento."}

Histórico de Exames Clínicos e Laudos Recentes:
${formattedExams || "Nenhum exame clínico registrado até o momento."}

Instruções Clínicas para o Resumo:
1. O resumo deve ser puramente técnico, profissional, direto, no modelo de "Passagem de Caso" / "Evolução Médica" de alta eficiência. Use termos como "paciente apresenta histórico de...", "terapêutica contínua sob conformidade...", "sinais ou laudos sugerem...", etc.
2. Livre-se de qualquer tipo de linguagem acolhedora, calorosa, cordial ou sentimental. O leitor final é um médico que necessita revisar as condições, os exames anexos e as condutas do paciente de forma pragmática e célere no celular.
3. ATENÇÃO CRÍTICA: NÃO INVENTE NENHUMA INFORMAÇÃO, DIAGNÓSTICO OU TERAPÊUTICA. Baseie-se APENAS nos dados reais fornecidos acima. Se o paciente não possuir comorbidades, alergias, medicações, consultas ou exames nos dados reais acima, relate apenas isso de forma brevosa ou desconsidere, mas nunca deduza de forma fictícia ou inventada qualquer dado médico do paciente.
4. Estruture em Markdown limpo usando as seguintes seções estritas (O resumo completo DEVE ter no máximo 900 caracteres, seja extremamente conciso e use siglas médicas oficiais como HAS, DM, m.c. etc.):
   - **Sumário Clínico & Status Atual**: Diagnóstico, esquema terapêutico e status atual do paciente.
   - **Achados nos Exames/Consultas**: Alterações críticas e pontos de atenção nos exames e consultas recentes.
   - **Conduta Sugerida**: De 2 a 3 diretrizes práticas diretas para acompanhamento (ex: exames de controle, reavaliação).
5. Seja extremamente direto, conciso e use terminologia de prontuário eletrónico de alta fidelidade de forma a ocupar menos de 900 caracteres no total. Escreva estritamente em português (do Brasil).`;

    console.log(`[Gemini API] Solicitando geração de conteúdo para o modelo "gemini-3.5-flash". Tamanho estimado do prompt: ${prompt.length} caracteres.`);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é um copiloto médico virtual altamente técnico e preciso. Suas avaliações são formuladas estritamente sob o tom de uma discussão de caso clínico de médico para médico, focadas em extrema brevidade, terminologia do prontuário oficial e alto pragmatismo clínico. O total de caracteres combinados de todas as seções geradas jamais deve exceder 900 caracteres.",
      }
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

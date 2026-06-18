export default async function handler(req: any, res: any) {
  // Diagnóstico temporário: apenas verifica se a chave de API do Gemini existe
  const isConfigured = typeof process.env.GEMINI_API_KEY === "string" && process.env.GEMINI_API_KEY.trim().length > 0;
  
  return res.status(200).json({
    geminiConfigured: isConfigured,
  });
}

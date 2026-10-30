import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function hasValidGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: hasValidGeminiApiKey(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/pulse-ai', async (req, res) => {
    const { mensagem, contextoResumo } = req.body ?? {};
    if (!mensagem || typeof mensagem !== 'string') {
      res.status(400).json({ error: 'Mensagem inválida.' });
      return;
    }

    if (!hasValidGeminiApiKey()) {
      res.status(200).json({
        connected: false,
        reason: 'Chave GEMINI_API_KEY não configurada no servidor; utilizando motor determinístico local do PULSE.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `Você é o PULSE AI, assistente pessoal de nutrição acessível (baseado na tabela TACO/TBCA do Brasil) e treinamento físico baseado em evidências.
Regras obrigatórias:
1. Responda sempre em português brasileiro claro, acolhedor e objetivo.
2. Consulte o contexto real do usuário fornecido abaixo (perfil, objetivo, metas calculadas, orçamento declarado, despensa atual em casa, plano alimentar e treino).
3. Nunca prometa resultados garantidos em determinado número de dias, nunca sugira dietas de fome, desidratação ou restrição energética extrema.
4. Nunca afirme que já alterou o banco de dados por conta própria: quando sugerir uma mudança no plano (orcamento, despensa, trocar refeição, excluir alimento que não gosta, mudar objetivo ou treino rápido), preencha o objeto opcional "propostaAcao" para que o usuário confirme no botão da interface.
5. Quando citar preços de alimentos, esclareça que são estimativas médias nacionais aproximadas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Contexto atual do usuário no aplicativo PULSE:\n${JSON.stringify(contextoResumo, null, 2)}\n\nMensagem do usuário: "${mensagem}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              textoResposta: {
                type: Type.STRING,
                description: 'Resposta em markdown claro para o usuário.',
              },
              propostaAcao: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  tipo: {
                    type: Type.STRING,
                    description:
                      'Valores permitidos: atualizar_orcamento | trocar_refeicao | adicionar_despensa | remover_alimento_nao_gosta | mudar_objetivo | gerar_treino_rapido | nenhum',
                  },
                  resumoAcao: {
                    type: Type.STRING,
                    description: 'Resumo curto da alteração que será feita após confirmação.',
                  },
                  orcamentoValor: {
                    type: Type.NUMBER,
                    nullable: true,
                  },
                  alimentoExcluido: {
                    type: Type.STRING,
                    nullable: true,
                  },
                  tempoSessaoMinutos: {
                    type: Type.NUMBER,
                    nullable: true,
                  },
                  localTreino: {
                    type: Type.STRING,
                    nullable: true,
                  },
                  objetivoPrincipal: {
                    type: Type.STRING,
                    nullable: true,
                  },
                },
              },
            },
            required: ['textoResposta'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({
        connected: true,
        textoResposta: parsed.textoResposta,
        propostaAcao: parsed.propostaAcao,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao consultar API Gemini';
      res.status(200).json({
        connected: false,
        error: msg,
        reason: 'Falha temporária na API remota; acionando motor determinístico local.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PULSE Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

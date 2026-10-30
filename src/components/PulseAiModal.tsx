import React, { useEffect, useState } from 'react';
import {
  AssistantActionProposal,
  AssistantMessage,
  PulseDatabaseState,
} from '../domain/types';
import { generateLocalAssistantResponse } from '../domain/assistantEngine';
import {
  CheckCircle2,
  MessageSquareHeart,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

interface PulseAiModalProps {
  aberto: boolean;
  onClose: () => void;
  estado: PulseDatabaseState;
  onAddAssistantMessages: (msgs: AssistantMessage[]) => void;
  onConfirmActionProposal: (proposta: AssistantActionProposal) => void;
}

const QUICK_PROMPTS = [
  'Só tenho R$ 20 para comida até amanhã.',
  'Tenho ovos e arroz. O que consigo preparar?',
  'Troca meu almoço por uma opção sem frango.',
  'Não consegui seguir a dieta hoje. Como posso ajustar o restante do dia?',
  'Tenho 30 minutos para treinar.',
  'Preciso de um treino para fazer em casa.',
  'Monta uma lista de compras econômica.',
  'Não gosto de leite. Quais alternativas posso usar?',
];

export const PulseAiModal: React.FC<PulseAiModalProps> = ({
  aberto,
  onClose,
  estado,
  onAddAssistantMessages,
  onConfirmActionProposal,
}) => {
  const [inputTexto, setInputTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [iaRemotaConectada, setIaRemotaConectada] = useState<boolean | null>(null);

  useEffect(() => {
    if (!aberto) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setIaRemotaConectada(Boolean(data?.geminiConfigured)))
      .catch(() => setIaRemotaConectada(false));
  }, [aberto]);

  if (!aberto) return null;

  const enviarMensagem = async (textoCru: string) => {
    const pergunta = textoCru.trim();
    if (!pergunta || enviando) return;
    setInputTexto('');
    setEnviando(true);

    const msgUsuario: AssistantMessage = {
      id: `msg_${Date.now()}_user`,
      remetente: 'usuario',
      texto: pergunta,
      criadoEmISO: new Date().toISOString(),
      origem: 'motor_local_deterministico',
    };

    // Prepara resposta local determinística como base confiável (ou fallback imediato)
    const respostaLocal = generateLocalAssistantResponse(pergunta, estado);

    try {
      const resumoContexto = {
        nome: estado.perfil.nome,
        objetivo: estado.perfil.objetivoPrincipal,
        metas: {
          kcal: estado.metasNutricionais.caloriasMetaKcal,
          proteinas: estado.metasNutricionais.proteinasGramas,
          carboidratos: estado.metasNutricionais.carboidratosGramas,
          gorduras: estado.metasNutricionais.gordurasGramas,
        },
        orcamento: `${estado.perfil.orcamentoValor} BRL/${estado.perfil.orcamentoPeriodo}`,
        despensaEmCasa: estado.perfil.despensa.map((d) => `${d.nome} (${d.quantidadeGramas}g)`),
        refeicoesAtuais: estado.planoAlimentar.refeicoes.map((r) => ({
          id: r.id,
          slot: r.tituloSlot,
          nome: r.nomeRefeicao,
          kcal: r.caloriasTotais,
        })),
        treinoAtual: estado.planoTreino.tituloPlano,
      };

      const resp = await fetch('/api/pulse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: pergunta,
          contextoResumo: resumoContexto,
        }),
      });
      const json = await resp.json();

      if (json.connected && json.textoResposta) {
        setIaRemotaConectada(true);
        let propostaFinal: AssistantActionProposal | undefined = respostaLocal.propostaAcao;

        if (
          json.propostaAcao &&
          json.propostaAcao.tipo &&
          json.propostaAcao.tipo !== 'nenhum' &&
          !propostaFinal
        ) {
          propostaFinal = {
            tipo: json.propostaAcao.tipo,
            resumoAcao: json.propostaAcao.resumoAcao || 'Atualizar plano conforme conversa',
            parametros: {
              orcamentoValor: json.propostaAcao.orcamentoValor,
              alimentoExcluido: json.propostaAcao.alimentoExcluido,
              tempoSessaoMinutos: json.propostaAcao.tempoSessaoMinutos,
              localTreino: json.propostaAcao.localTreino,
              objetivoPrincipal: json.propostaAcao.objetivoPrincipal,
            },
            executada: false,
          };
        }

        const msgAssistente: AssistantMessage = {
          id: `msg_${Date.now()}_ai`,
          remetente: 'assistente',
          texto: json.textoResposta,
          criadoEmISO: new Date().toISOString(),
          origem: 'ia_remota_gemini',
          propostaAcao: propostaFinal,
        };
        onAddAssistantMessages([msgUsuario, msgAssistente]);
      } else {
        setIaRemotaConectada(false);
        const msgAssistente: AssistantMessage = {
          id: `msg_${Date.now()}_local`,
          remetente: 'assistente',
          texto: respostaLocal.textoResposta,
          criadoEmISO: new Date().toISOString(),
          origem: 'motor_local_deterministico',
          propostaAcao: respostaLocal.propostaAcao,
        };
        onAddAssistantMessages([msgUsuario, msgAssistente]);
      }
    } catch {
      setIaRemotaConectada(false);
      const msgAssistente: AssistantMessage = {
        id: `msg_${Date.now()}_local_err`,
        remetente: 'assistente',
        texto: respostaLocal.textoResposta,
        criadoEmISO: new Date().toISOString(),
        origem: 'motor_local_deterministico',
        propostaAcao: respostaLocal.propostaAcao,
      };
      onAddAssistantMessages([msgUsuario, msgAssistente]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PULSE AI Assistente Conversacional"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-[#121212] border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[90vh] sm:h-[82vh] flex flex-col justify-between overflow-hidden">
        {/* Cabeçalho PULSE AI */}
        <header className="p-4 sm:p-5 bg-[#1B1B1B] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF2D8D]/20 border border-[#FF2D8D] flex items-center justify-center text-[#FF2D8D]">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">PULSE AI</h2>
              <p className="text-[11px] text-[#B3B3B3] flex items-center gap-1.5">
                {iaRemotaConectada ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>API Gemini Conectada + Regras Determinísticas TACO</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[#FF65AD]" />
                    <span>Modo Local Determinístico Ativo (Funciona sem API / Offline)</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar PULSE AI"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121212] flex items-center justify-center text-[#B3B3B3] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Histórico de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {estado.mensagensAssistente.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.remetente === 'usuario' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                  msg.remetente === 'usuario'
                    ? 'bg-[#FF2D8D] text-white'
                    : 'bg-[#1B1B1B] border border-white/10 text-white'
                }`}
              >
                <div className="whitespace-pre-line">
                  {msg.texto.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={idx} className="font-semibold text-white">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}
                </div>

                {/* Card de confirmação para atualizar dados reais do aplicativo */}
                {msg.propostaAcao && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <p className="text-xs text-[#FF65AD] font-semibold">
                      Ação disponível no seu plano real:
                    </p>
                    <p className="text-xs text-[#B3B3B3]">{msg.propostaAcao.resumoAcao}</p>
                    {msg.propostaAcao.executada ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Alteração confirmada e aplicada no banco de dados</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onConfirmActionProposal(msg.propostaAcao!)}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Confirmar e Atualizar Meu Plano Agora</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#B3B3B3] mt-1 px-1">
                {msg.remetente === 'usuario'
                  ? 'Você'
                  : msg.origem === 'ia_remota_gemini'
                  ? 'PULSE AI (Gemini + Contexto Real)'
                  : 'PULSE AI (Motor Determinístico Local)'}
              </span>
            </div>
          ))}
        </div>

        {/* Sugestões Rápidas + Campo de Envio */}
        <footer className="p-4 bg-[#1B1B1B] border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => enviarMensagem(prompt)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/10 text-xs text-[#B3B3B3] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensagem(inputTexto);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Digite sua mensagem para o PULSE AI"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder="Pergunte sobre receitas com o que tem em casa, orçamento ou treino..."
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-[#121212] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FF2D8D]"
            />
            <button
              type="submit"
              disabled={enviando || !inputTexto.trim()}
              aria-label="Enviar mensagem"
              className="min-h-[48px] px-5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{enviando ? 'Analisando...' : 'Enviar'}</span>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

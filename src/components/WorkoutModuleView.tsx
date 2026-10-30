import React, { useEffect, useState } from 'react';
import {
  ExerciseDefinition,
  LoggedSet,
  PulseDatabaseState,
  WorkoutDay,
  WorkoutSessionLog,
} from '../domain/types';
import { EXERCISE_DATABASE, findExerciseById } from '../domain/exerciseDatabase';
import {
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  History,
  Info,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Timer,
  X,
} from 'lucide-react';

interface WorkoutModuleViewProps {
  estado: PulseDatabaseState;
  treinoAtivoDia: WorkoutDay | null;
  onStartActiveWorkout: (day: WorkoutDay | null) => void;
  onSwapExerciseInDay: (workoutDayId: string, oldExId: string, newExId: string) => void;
  onCompleteWorkoutSession: (log: Omit<WorkoutSessionLog, 'id'>) => void;
}

export const WorkoutModuleView: React.FC<WorkoutModuleViewProps> = ({
  estado,
  treinoAtivoDia,
  onStartActiveWorkout,
  onSwapExerciseInDay,
  onCompleteWorkoutSession,
}) => {
  const { planoTreino, historicoTreinos } = estado;
  const [abaTreino, setAbaTreino] = useState<'plano' | 'biblioteca' | 'historico'>('plano');
  const [filtroBiblioteca, setFiltroBiblioteca] = useState<string>('todos');
  const [exercicioDetalhe, setExercicioDetalhe] = useState<{
    def: ExerciseDefinition;
    workoutDayId?: string;
  } | null>(null);

  // Estados do Treino Ativo com Cronômetro
  const [segundosSessao, setSegundosSessao] = useState(0);
  const [sessaoPausada, setSessaoPausada] = useState(false);
  const [descansoRestante, setDescansoRestante] = useState(0);
  const [notasSessao, setNotasSessao] = useState('');
  const [seriesAtivas, setSeriesAtivas] = useState<Record<string, LoggedSet[]>>({});

  // Inicializar séries quando abrir um treino ativo
  useEffect(() => {
    if (!treinoAtivoDia) return;
    setSegundosSessao(0);
    setSessaoPausada(false);
    setDescansoRestante(0);
    const inicial: Record<string, LoggedSet[]> = {};
    for (const ex of treinoAtivoDia.exercicios) {
      inicial[ex.exerciseId] = Array.from({ length: ex.series }, (_, idx) => ({
        numeroSerie: idx + 1,
        repeticoesFeitas: Number(ex.repeticoes.match(/\d+/)?.[0] ?? 10),
        cargaKg: ex.cargaSugeridaKg ?? 0,
        concluida: false,
      }));
    }
    setSeriesAtivas(inicial);
  }, [treinoAtivoDia]);

  // Cronômetro em tempo real do treino ativo e descanso
  useEffect(() => {
    if (!treinoAtivoDia || sessaoPausada) return;
    const interval = setInterval(() => {
      setSegundosSessao((s) => s + 1);
      setDescansoRestante((d) => (d > 0 ? d - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [treinoAtivoDia, sessaoPausada]);

  const formatTimer = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleConcluirTreinoAtivo = () => {
    if (!treinoAtivoDia) return;
    const hojeISO = new Date().toISOString().slice(0, 10);
    onCompleteWorkoutSession({
      dataISO: hojeISO,
      workoutDayId: treinoAtivoDia.id,
      tituloTreino: treinoAtivoDia.titulo,
      duracaoRealSegundos: Math.max(60, segundosSessao),
      exerciciosRealizados: treinoAtivoDia.exercicios.map((ex) => ({
        exerciseId: ex.exerciseId,
        nome: ex.nome,
        series: seriesAtivas[ex.exerciseId] ?? [],
      })),
      notasSessao:
        notasSessao.trim() || 'Treino concluído respeitando intervalos e controle técnico.',
    });
    onStartActiveWorkout(null);
    setAbaTreino('historico');
  };

  const exerciciosFiltrados = EXERCISE_DATABASE.filter((ex) => {
    if (filtroBiblioteca === 'todos') return true;
    if (filtroBiblioteca === 'casa') return ex.locaisCompativeis.includes('casa');
    if (filtroBiblioteca === 'academia') return ex.locaisCompativeis.includes('academia');
    if (filtroBiblioteca === 'sem_equipamento') return ex.equipamentosNecessarios.includes('nenhum');
    if (filtroBiblioteca === 'halteres') return ex.equipamentosNecessarios.includes('halteres');
    return ex.categoria === filtroBiblioteca;
  });

  // Se estiver no modo TREINO ATIVO COM CRONÔMETRO
  if (treinoAtivoDia) {
    return (
      <div className="space-y-5 pb-10">
        {/* Barra Superior do Treino Ativo */}
        <div className="bg-[#1B1B1B] border border-[#FF2D8D] rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#FF65AD]">TREINO ATIVO EM ANDAMENTO</p>
              <h1 className="font-display text-xl font-bold text-white">{treinoAtivoDia.titulo}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-[#121212] px-4 py-2 rounded-xl border border-white/10 text-center">
                <p className="text-[10px] text-[#B3B3B3]">Tempo de Sessão</p>
                <p className="text-lg font-bold font-mono-num text-white">
                  {formatTimer(segundosSessao)}
                </p>
              </div>

              {descansoRestante > 0 && (
                <div className="bg-[#FF2D8D]/20 px-4 py-2 rounded-xl border border-[#FF2D8D] text-center">
                  <p className="text-[10px] text-[#FF65AD]">Descanso</p>
                  <p className="text-lg font-bold font-mono-num text-white">
                    {formatTimer(descansoRestante)}
                  </p>
                </div>
              )}

              <button
                type="button"
                aria-label={sessaoPausada ? 'Retomar cronômetro' : 'Pausar cronômetro'}
                onClick={() => setSessaoPausada(!sessaoPausada)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121212] border border-white/15 flex items-center justify-center text-white cursor-pointer"
              >
                {sessaoPausada ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onStartActiveWorkout(null)}
                className="min-h-[44px] px-3 rounded-xl bg-[#121212] border border-white/15 text-xs text-[#B3B3B3] hover:text-white cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>

          <p className="text-xs text-[#B3B3B3]">{planoTreino.avisoSeguranca}</p>
        </div>

        {/* Lista de Exercícios e Séries */}
        <div className="space-y-4">
          {treinoAtivoDia.exercicios.map((ex) => {
            const listaSeries = seriesAtivas[ex.exerciseId] ?? [];
            const def = findExerciseById(ex.exerciseId);
            return (
              <div
                key={ex.exerciseId}
                className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-white">{ex.nome}</h2>
                    <p className="text-xs text-[#B3B3B3]">
                      Meta: {ex.series} séries de {ex.repeticoes} · Descanso sugerido: {ex.descansoSegundos}s
                    </p>
                  </div>
                  {def && (
                    <button
                      type="button"
                      onClick={() =>
                        setExercicioDetalhe({ def, workoutDayId: treinoAtivoDia.id })
                      }
                      className="min-h-[40px] px-3 rounded-xl bg-[#121212] border border-white/15 text-xs text-[#FF65AD] cursor-pointer"
                    >
                      Instruções / Trocar
                    </button>
                  )}
                </div>

                {/* Tabela de Séries */}
                <div className="space-y-2">
                  {listaSeries.map((s, idx) => (
                    <div
                      key={s.numeroSerie}
                      className={`grid grid-cols-4 items-center gap-2 p-2.5 rounded-xl border ${
                        s.concluida
                          ? 'bg-[#FF2D8D]/15 border-[#FF2D8D]/50'
                          : 'bg-[#121212] border-white/5'
                      }`}
                    >
                      <span className="text-xs font-mono-num text-[#B3B3B3]">
                        Série {s.numeroSerie}
                      </span>

                      <div>
                        <label
                          htmlFor={`carga-${ex.exerciseId}-${idx}`}
                          className="block text-[10px] text-[#B3B3B3]"
                        >
                          Carga (kg)
                        </label>
                        <input
                          id={`carga-${ex.exerciseId}-${idx}`}
                          type="number"
                          min={0}
                          step={1}
                          value={s.cargaKg}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setSeriesAtivas((prev) => ({
                              ...prev,
                              [ex.exerciseId]: prev[ex.exerciseId].map((item, i) =>
                                i === idx ? { ...item, cargaKg: val } : item
                              ),
                            }));
                          }}
                          className="w-full min-h-[36px] px-2 rounded-lg bg-[#1B1B1B] border border-white/15 text-xs text-white font-mono-num"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`reps-${ex.exerciseId}-${idx}`}
                          className="block text-[10px] text-[#B3B3B3]"
                        >
                          Repetições
                        </label>
                        <input
                          id={`reps-${ex.exerciseId}-${idx}`}
                          type="number"
                          min={1}
                          value={s.repeticoesFeitas}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            setSeriesAtivas((prev) => ({
                              ...prev,
                              [ex.exerciseId]: prev[ex.exerciseId].map((item, i) =>
                                i === idx ? { ...item, repeticoesFeitas: val } : item
                              ),
                            }));
                          }}
                          className="w-full min-h-[36px] px-2 rounded-lg bg-[#1B1B1B] border border-white/15 text-xs text-white font-mono-num"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const novoEstado = !s.concluida;
                          setSeriesAtivas((prev) => ({
                            ...prev,
                            [ex.exerciseId]: prev[ex.exerciseId].map((item, i) =>
                              i === idx ? { ...item, concluida: novoEstado } : item
                            ),
                          }));
                          if (novoEstado) {
                            setDescansoRestante(ex.descansoSegundos);
                          }
                        }}
                        className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                          s.concluida
                            ? 'bg-[#FF2D8D] text-white'
                            : 'bg-[#1B1B1B] border border-white/15 text-[#B3B3B3]'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{s.concluida ? 'Feita' : 'Marcar'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
          <label htmlFor="treino-notas" className="block text-xs font-medium text-white">
            Observações desta sessão (sensação de esforço, cargas, conforto articular):
          </label>
          <input
            id="treino-notas"
            type="text"
            value={notasSessao}
            onChange={(e) => setNotasSessao(e.target.value)}
            placeholder="Ex.: Boa execução no agachamento, sem dor articular."
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleConcluirTreinoAtivo}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Finalizar e Salvar Treino no Histórico</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Navegação de Abas do Módulo de Treino */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: 'plano', label: 'Meu Plano de Treino', icon: Dumbbell },
          { id: 'biblioteca', label: 'Biblioteca de Exercícios', icon: Info },
          { id: 'historico', label: 'Histórico de Treinos', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativo = abaTreino === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAbaTreino(tab.id as typeof abaTreino)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                ativo ? 'bg-[#FF2D8D] text-white' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ABA 1: PLANO DE TREINO ADAPTADO */}
      {abaTreino === 'plano' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-2">
            <h1 className="font-display text-xl font-bold text-white">{planoTreino.tituloPlano}</h1>
            <p className="text-xs text-[#B3B3B3]">{planoTreino.descricao}</p>
            <p className="text-xs text-[#FF65AD] flex items-start gap-1.5 pt-1">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{planoTreino.avisoSeguranca}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planoTreino.dias.map((dia) => (
              <div
                key={dia.id}
                className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
                    <span className="text-[#FF65AD] font-semibold">{dia.codigoDia}</span>
                    <span className="font-mono-num">~{dia.duracaoEstimadaMin} min</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-white">{dia.titulo}</h2>
                  <p className="text-xs text-[#B3B3B3]">{dia.foco}</p>

                  {/* Aquecimento */}
                  <div className="bg-[#121212] p-3 rounded-2xl space-y-1">
                    <p className="text-[11px] font-semibold text-white">Aquecimento obrigatório:</p>
                    {dia.aquecimento.map((aq, i) => (
                      <p key={i} className="text-[11px] text-[#B3B3B3]">
                        • {aq}
                      </p>
                    ))}
                  </div>

                  {/* Exercícios do Dia */}
                  <div className="space-y-2">
                    {dia.exercicios.map((ex) => {
                      const def = findExerciseById(ex.exerciseId);
                      return (
                        <div
                          key={ex.exerciseId}
                          className="flex items-center justify-between gap-2 bg-[#121212] px-3.5 py-2.5 rounded-xl border border-white/5"
                        >
                          <div>
                            <p className="text-xs font-semibold text-white">{ex.nome}</p>
                            <p className="text-[11px] text-[#B3B3B3] font-mono-num">
                              {ex.series} séries × {ex.repeticoes} · Descanso {ex.descansoSegundos}s
                            </p>
                          </div>
                          {def && (
                            <button
                              type="button"
                              onClick={() =>
                                setExercicioDetalhe({ def, workoutDayId: dia.id })
                              }
                              className="min-h-[36px] px-2.5 rounded-lg bg-[#1B1B1B] text-[11px] text-[#FF65AD] hover:underline shrink-0 cursor-pointer"
                            >
                              Ver / Trocar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartActiveWorkout(dia)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Timer className="w-4 h-4" />
                  <span>Iniciar {dia.codigoDia} com Cronômetro</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: BIBLIOTECA DE EXERCÍCIOS ESTRUTURADA */}
      {abaTreino === 'biblioteca' && (
        <div className="space-y-4">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              Biblioteca Técnica de Exercícios
            </h1>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'casa', label: 'Em Casa' },
                { id: 'academia', label: 'Academia' },
                { id: 'sem_equipamento', label: 'Sem Equipamentos' },
                { id: 'halteres', label: 'Com Halteres' },
                { id: 'forca', label: 'Força' },
                { id: 'hipertrofia', label: 'Hipertrofia' },
                { id: 'condicionamento', label: 'Condicionamento' },
                { id: 'mobilidade', label: 'Mobilidade' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroBiblioteca(f.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
                    filtroBiblioteca === f.id
                      ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                      : 'bg-[#121212] border-white/10 text-[#B3B3B3]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {exerciciosFiltrados.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-white">{ex.nome}</h2>
                      <span className="text-[11px] text-[#FF65AD] shrink-0">
                        {ex.grupoMuscularPrincipal.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#B3B3B3] mt-1">
                      Secundários: {ex.musculosSecundarios.join(', ')} · Equip.:{' '}
                      {ex.equipamentosNecessarios.join(', ')}
                    </p>
                    <p className="text-[11px] text-[#B3B3B3] mt-1">
                      Referência: {ex.referenciaTecnica}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExercicioDetalhe({ def: ex })}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#1B1B1B] hover:bg-white/10 border border-white/15 text-xs text-white cursor-pointer"
                  >
                    Ver instruções completas e substitutos
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE TREINOS CONCLUÍDOS */}
      {abaTreino === 'historico' && (
        <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
          <h1 className="font-display text-xl font-bold text-white">Histórico de Sessões Concluídas</h1>
          {historicoTreinos.length === 0 ? (
            <p className="text-xs text-[#B3B3B3] py-6 text-center">
              Nenhum treino finalizado ainda. Inicie um treino pelo botão com cronômetro para
              registrar suas séries e cargas.
            </p>
          ) : (
            <div className="space-y-3">
              {historicoTreinos.map((sessao) => (
                <div
                  key={sessao.id}
                  className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#FF65AD] font-semibold">{sessao.dataISO}</span>
                    <span className="font-mono-num text-[#B3B3B3]">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {Math.round(sessao.duracaoRealSegundos / 60)} min
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white">{sessao.tituloTreino}</h2>
                  <p className="text-xs text-[#B3B3B3]">{sessao.notasSessao}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sessao.exerciciosRealizados.map((exR) => (
                      <span
                        key={exR.exerciseId}
                        className="text-[11px] text-white bg-[#1B1B1B] px-2.5 py-1 rounded-lg"
                      >
                        {exR.nome}: {exR.series.length} séries
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALHE DO EXERCÍCIO E SUBSTITUIÇÃO */}
      {exercicioDetalhe && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Instruções de ${exercicioDetalhe.def.nome}`}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-[#1B1B1B] border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#FF65AD]">
                  Grupo principal: {exercicioDetalhe.def.grupoMuscularPrincipal.replace('_', ' ')}
                </p>
                <h2 className="font-display text-xl font-bold text-white">
                  {exercicioDetalhe.def.nome}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhe do exercício"
                onClick={() => setExercicioDetalhe(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121212] flex items-center justify-center text-[#B3B3B3] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#B3B3B3] bg-[#121212] p-3.5 rounded-2xl space-y-1">
              <p>
                <strong className="text-white">Prescrição base:</strong>{' '}
                {exercicioDetalhe.def.seriesRecomendadas} séries de{' '}
                {exercicioDetalhe.def.repeticoesRecomendadas} · Descanso{' '}
                {exercicioDetalhe.def.descansoSegundos}s
              </p>
              <p>
                <strong className="text-white">Músculos secundários:</strong>{' '}
                {exercicioDetalhe.def.musculosSecundarios.join(', ')}
              </p>
              <p>
                <strong className="text-white">Referência técnica:</strong>{' '}
                {exercicioDetalhe.def.referenciaTecnica}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Passo a Passo de Execução</h3>
              <ol className="space-y-1.5 text-xs text-[#B3B3B3] list-decimal list-inside bg-[#121212] p-4 rounded-2xl">
                {exercicioDetalhe.def.instrucoesExecucao.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#FF2D8D]/30 text-xs text-[#B3B3B3]">
              <strong className="text-[#FF65AD]">Segurança Biomecânica:</strong>{' '}
              {exercicioDetalhe.def.dicaSeguranca}
            </div>

            {exercicioDetalhe.workoutDayId &&
              exercicioDetalhe.def.substitutosCompativeisIds.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-white">
                    Substituir por exercício alternativo compatível neste treino:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exercicioDetalhe.def.substitutosCompativeisIds.map((subId) => {
                      const subEx = findExerciseById(subId);
                      if (!subEx) return null;
                      return (
                        <button
                          key={subId}
                          type="button"
                          onClick={() => {
                            onSwapExerciseInDay(
                              exercicioDetalhe.workoutDayId!,
                              exercicioDetalhe.def.id,
                              subEx.id
                            );
                            setExercicioDetalhe(null);
                          }}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Trocar por {subEx.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

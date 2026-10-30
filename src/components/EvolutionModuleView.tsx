import React, { useState } from 'react';
import { BodyMeasurementEntry, PulseDatabaseState } from '../domain/types';
import {
  Calendar,
  Camera,
  Plus,
  Scale,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from 'lucide-react';

interface EvolutionModuleViewProps {
  estado: PulseDatabaseState;
  onAddMeasurement: (entry: Omit<BodyMeasurementEntry, 'id'>) => void;
  onDeleteMeasurement: (id: string) => void;
}

export const EvolutionModuleView: React.FC<EvolutionModuleViewProps> = ({
  estado,
  onAddMeasurement,
  onDeleteMeasurement,
}) => {
  const { historicoMedidas, historicoTreinos, perfil, sequenciaHabitosDias } = estado;

  const [pesoInput, setPesoInput] = useState(String(perfil.pesoAtualKg));
  const [cinturaInput, setCinturaInput] = useState('84');
  const [quadrilInput, setQuadrilInput] = useState('98');
  const [bracoInput, setBracoInput] = useState('33');
  const [notaInput, setNotaInput] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | undefined>(undefined);

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSalvarMedida = (e: React.FormEvent) => {
    e.preventDefault();
    const peso = Number(pesoInput);
    if (Number.isNaN(peso) || peso < 30 || peso > 300) return;

    onAddMeasurement({
      dataISO: new Date().toISOString().slice(0, 10),
      pesoKg: peso,
      cinturaCm: cinturaInput ? Number(cinturaInput) : undefined,
      quadrilCm: quadrilInput ? Number(quadrilInput) : undefined,
      bracoCm: bracoInput ? Number(bracoInput) : undefined,
      fotoReferenciaUrl: fotoPreview,
      notaPessoal:
        notaInput.trim() || 'Registro periódico de acompanhamento físico.',
    });
    setNotaInput('');
    setFotoPreview(undefined);
  };

  // Preparar pontos do gráfico SVG de evolução de peso
  const medidasOrdenadas = [...historicoMedidas].reverse();
  const pesos = medidasOrdenadas.map((m) => m.pesoKg);
  const minPeso = Math.min(...pesos, perfil.pesoAtualKg - 2);
  const maxPeso = Math.max(...pesos, perfil.pesoAtualKg + 2);
  const amplitude = Math.max(1, maxPeso - minPeso);

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho e Aviso de Interpretação Responsável */}
      <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-white">
            Evolução Física e Histórico de Medidas
          </h1>
          <span className="text-xs font-mono-num text-[#FF65AD]">
            Sequência: {sequenciaHabitosDias}d
          </span>
        </div>
        <p className="text-xs text-[#B3B3B3] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FF65AD] shrink-0 mt-0.5" />
          <span>
            <strong>Orientação baseada em evidências:</strong> Flutuações isoladas de peso entre um
            dia e outro refletem variações normais de água corporal, glicogênio muscular e trânsito
            intestinal — não representam ganho ou perda imediata de gordura. Avalie sempre a
            tendência média de 3 a 4 semanas.
          </span>
        </p>
      </div>

      {/* Gráfico Elegante de Evolução de Peso + Resumo de Treinos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF2D8D]" />
              <span>Curva de Peso Corporal (kg)</span>
            </h2>
            <span className="text-xs text-[#B3B3B3]">
              {medidasOrdenadas.length} {medidasOrdenadas.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="bg-[#121212] rounded-2xl p-4 h-48 flex flex-col justify-between">
            <svg className="w-full h-32 overflow-visible" viewBox="0 0 400 100">
              <line x1="0" y1="20" x2="400" y2="20" stroke="#262626" strokeDasharray="4 4" />
              <line x1="0" y1="50" x2="400" y2="50" stroke="#262626" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#262626" strokeDasharray="4 4" />

              {medidasOrdenadas.length === 1 ? (
                <circle cx="200" cy="50" r="6" fill="#FF2D8D" />
              ) : (
                <>
                  <polyline
                    fill="none"
                    stroke="#FF2D8D"
                    strokeWidth="3"
                    points={medidasOrdenadas
                      .map((m, idx) => {
                        const x = (idx / Math.max(1, medidasOrdenadas.length - 1)) * 360 + 20;
                        const y = 85 - ((m.pesoKg - minPeso) / amplitude) * 70;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                  {medidasOrdenadas.map((m, idx) => {
                    const x = (idx / Math.max(1, medidasOrdenadas.length - 1)) * 360 + 20;
                    const y = 85 - ((m.pesoKg - minPeso) / amplitude) * 70;
                    return (
                      <g key={m.id}>
                        <circle cx={x} cy={y} r="5" fill="#FF65AD" />
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                        >
                          {m.pesoKg}kg
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            <div className="flex items-center justify-between text-[11px] text-[#B3B3B3]">
              <span>Início: {medidasOrdenadas[0]?.pesoKg ?? perfil.pesoAtualKg} kg</span>
              <span>Atual: {historicoMedidas[0]?.pesoKg ?? perfil.pesoAtualKg} kg</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Consistência e Progressão</h2>
            <p className="text-xs text-[#B3B3B3]">
              Acompanhe seus treinos concluídos e evolução de cargas sem pressa.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="bg-[#121212] p-3.5 rounded-2xl">
              <p className="text-xs text-[#B3B3B3]">Sessões de Treino Concluídas</p>
              <p className="text-xl font-bold font-mono-num text-white mt-0.5">
                {historicoTreinos.length} sessões
              </p>
            </div>
            <div className="bg-[#121212] p-3.5 rounded-2xl">
              <p className="text-xs text-[#B3B3B3]">Sequência de Hábitos Registrados</p>
              <p className="text-xl font-bold font-mono-num text-[#FF65AD] mt-0.5">
                {sequenciaHabitosDias} {sequenciaHabitosDias === 1 ? 'dia ativo' : 'dias ativos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário para Registrar Novo Peso, Medidas e Foto Opcional */}
      <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#FF65AD]" />
          <span>Registrar Peso, Medidas Corporais e Nota Pessoal</span>
        </h2>

        <form onSubmit={handleSalvarMedida} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="med-peso" className="block text-xs text-[#B3B3B3] mb-1">
                Peso (kg) *
              </label>
              <input
                id="med-peso"
                type="number"
                step="0.1"
                min={30}
                max={300}
                value={pesoInput}
                onChange={(e) => setPesoInput(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
              />
            </div>

            <div>
              <label htmlFor="med-cintura" className="block text-xs text-[#B3B3B3] mb-1">
                Cintura (cm - opcional)
              </label>
              <input
                id="med-cintura"
                type="number"
                step="0.5"
                value={cinturaInput}
                onChange={(e) => setCinturaInput(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
              />
            </div>

            <div>
              <label htmlFor="med-quadril" className="block text-xs text-[#B3B3B3] mb-1">
                Quadril (cm - opcional)
              </label>
              <input
                id="med-quadril"
                type="number"
                step="0.5"
                value={quadrilInput}
                onChange={(e) => setQuadrilInput(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
              />
            </div>

            <div>
              <label htmlFor="med-braco" className="block text-xs text-[#B3B3B3] mb-1">
                Braço (cm - opcional)
              </label>
              <input
                id="med-braco"
                type="number"
                step="0.5"
                value={bracoInput}
                onChange={(e) => setBracoInput(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="med-nota" className="block text-xs text-[#B3B3B3] mb-1">
                Nota pessoal (sono, disposição, fase do treino)
              </label>
              <input
                id="med-nota"
                type="text"
                value={notaInput}
                onChange={(e) => setNotaInput(e.target.value)}
                placeholder="Ex.: Dormi 7h30, sentindo mais disposição nos treinos."
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white"
              />
            </div>

            <div>
              <label
                htmlFor="med-foto"
                className="block text-xs text-[#B3B3B3] mb-1"
              >
                Foto opcional (salva só no aparelho)
              </label>
              <label
                htmlFor="med-foto"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5"
              >
                <Camera className="w-4 h-4 text-[#FF65AD]" />
                <span>{fotoPreview ? 'Foto anexada' : 'Anexar foto'}</span>
                <input
                  id="med-foto"
                  type="file"
                  accept="image/*"
                  onChange={handleFotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Registro de Evolução</span>
          </button>
        </form>
      </div>

      {/* Histórico de Peso e Medidas */}
      <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Histórico Completo de Peso e Medidas</h2>
        <div className="space-y-2.5">
          {historicoMedidas.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 bg-[#121212] px-4 py-3 rounded-2xl border border-white/5"
            >
              <div className="space-y-0.5">
                <p className="text-xs text-[#FF65AD] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{m.dataISO}</span>
                </p>
                <p className="text-sm font-bold font-mono-num text-white">
                  Peso: {m.pesoKg} kg
                  {m.cinturaCm ? ` · Cintura: ${m.cinturaCm} cm` : ''}
                  {m.quadrilCm ? ` · Quadril: ${m.quadrilCm} cm` : ''}
                  {m.bracoCm ? ` · Braço: ${m.bracoCm} cm` : ''}
                </p>
                <p className="text-xs text-[#B3B3B3]">{m.notaPessoal}</p>
              </div>
              <button
                type="button"
                aria-label={`Excluir registro de medida de ${m.dataISO}`}
                onClick={() => onDeleteMeasurement(m.id)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#B3B3B3] hover:text-[#FF2D8D] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

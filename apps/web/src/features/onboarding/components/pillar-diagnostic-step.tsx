'use client';

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';

type ChildRow = {
  clientKey: string;
  firstName: string;
};

type PillarDef = {
  id: string;
  name: string;
  color: string;
  bg: string;
  questions: [string, string];
};

const PILLARS: PillarDef[] = [
  {
    id: 'P1',
    name: 'Aire & Regulación',
    color: '#0D5E9E',
    bg: '#EBF5FE',
    questions: [
      '¿Tu hijo duerme en un cuarto con ventilación adecuada?',
      '¿Evitan pantallas al menos 1 hora antes de dormir?',
    ],
  },
  {
    id: 'P2',
    name: 'Tierra & Naturaleza',
    color: '#1A7A2E',
    bg: '#EAF5EC',
    questions: [
      '¿Juega al aire libre al menos 3 veces por semana?',
      '¿Tiene contacto con tierra, plantas o animales regularmente?',
    ],
  },
  {
    id: 'P3',
    name: 'Luz & Ritmos',
    color: '#9C6700',
    bg: '#FEF8E6',
    questions: [
      '¿Recibe luz natural en las primeras 2 horas del día?',
      '¿Mantiene un horario regular de sueño y vigilia?',
    ],
  },
  {
    id: 'P4',
    name: 'Agua e Hidratación',
    color: '#1060A0',
    bg: '#E8F4FD',
    questions: [
      '¿Bebe agua como bebida principal durante el día?',
      '¿Evita bebidas azucaradas en su rutina diaria?',
    ],
  },
  {
    id: 'P5',
    name: 'Alimentación',
    color: '#1e5f8a',
    bg: '#EBF5FE',
    questions: [
      '¿Come alimentos de origen natural la mayoría del tiempo?',
      '¿Participa en la preparación de comidas en casa?',
    ],
  },
  {
    id: 'P6',
    name: 'Emociones & Neuro',
    color: '#6130A0',
    bg: '#F3EEF9',
    questions: [
      '¿Nombran y validan emociones en casa con regularidad?',
      '¿Tienen momentos de juego conectado sin pantallas a diario?',
    ],
  },
  {
    id: 'P7',
    name: 'Movimiento & Fascia',
    color: '#A0321E',
    bg: '#FEF0ED',
    questions: [
      '¿Hace actividad física o juego activo todos los días?',
      '¿Tiene pausas del sedentarismo durante la jornada?',
    ],
  },
];

const SCALE_LABELS = ['Nunca', 'Pocas veces', 'A veces', 'Seguido', 'Siempre'];

type AnswerMap = Record<string, Record<number, number>>;

function computeScores(answers: AnswerMap): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const pillar of PILLARS) {
    const q0 = answers[pillar.id]?.[0] ?? 0;
    const q1 = answers[pillar.id]?.[1] ?? 0;
    scores[pillar.id] = (q0 + q1) / 2;
  }
  return scores;
}

function isComplete(answers: AnswerMap): boolean {
  return PILLARS.every(
    (p) => answers[p.id]?.[0] !== undefined && answers[p.id]?.[1] !== undefined,
  );
}

type Props = {
  childRows: ChildRow[];
  onComplete: (scores: Record<string, Record<string, number>>) => void;
  onSkip: () => void;
};

export function PillarDiagnosticStep({ childRows, onComplete, onSkip }: Props) {
  const [activeChildKey, setActiveChildKey] = useState<string>(
    childRows[0]?.clientKey ?? '',
  );
  const [answersByChild, setAnswersByChild] = useState<
    Record<string, AnswerMap>
  >({});

  function setAnswer(pillarId: string, qIndex: number, score: number) {
    setAnswersByChild((prev) => ({
      ...prev,
      [activeChildKey]: {
        ...prev[activeChildKey],
        [pillarId]: {
          ...(prev[activeChildKey]?.[pillarId] ?? {}),
          [qIndex]: score,
        },
      },
    }));
  }

  function handleComplete() {
    const result: Record<string, Record<string, number>> = {};
    for (const c of childRows) {
      const answers = answersByChild[c.clientKey] ?? {};
      result[c.clientKey] = computeScores(answers);
    }
    onComplete(result);
  }

  const activeAnswers = answersByChild[activeChildKey] ?? {};
  const activeComplete = isComplete(activeAnswers);
  const allChildrenDone = childRows.every((c) =>
    isComplete(answersByChild[c.clientKey] ?? {}),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Diagnóstico Eudify
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
          Los 7 Pilares del Desarrollo
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          2 preguntas por pilar, escala 1–5. El resultado guía el roadmap
          educativo de tu hijo desde el primer día.
        </p>
      </div>

      {childRows.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {childRows.map((c) => {
            const done = isComplete(answersByChild[c.clientKey] ?? {});
            return (
              <button
                key={c.clientKey}
                type="button"
                onClick={() => setActiveChildKey(c.clientKey)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  c.clientKey === activeChildKey
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                {c.firstName}
                {done ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-4">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.id}
            className="rounded-xl border border-border p-4"
            style={{ background: pillar.bg }}
          >
            <p
              className="mb-3 text-[13px] font-bold"
              style={{ color: pillar.color }}
            >
              {pillar.id} · {pillar.name}
            </p>
            <div className="space-y-3">
              {pillar.questions.map((question, qIndex) => {
                const selected = activeAnswers[pillar.id]?.[qIndex];
                return (
                  <div key={qIndex}>
                    <p className="mb-2 text-[13px] text-foreground">
                      {question}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SCALE_LABELS.map((label, score) => {
                        const value = score + 1;
                        const isSelected = selected === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setAnswer(pillar.id, qIndex, value)
                            }
                            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                              isSelected
                                ? 'border-transparent text-white'
                                : 'border-border bg-white text-muted-foreground hover:border-current'
                            }`}
                            style={
                              isSelected
                                ? { background: pillar.color, color: '#fff' }
                                : { color: pillar.color }
                            }
                          >
                            {value} · {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!activeComplete ? (
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          Responde todas las preguntas para continuar
          {childRows.length > 1 ? ' con este menor' : ''}.
        </p>
      ) : childRows.length > 1 && !allChildrenDone ? (
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          Cambia de pestaña para completar el diagnóstico de cada menor.
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-sm text-muted-foreground"
          onClick={onSkip}
        >
          Saltar por ahora
        </Button>
        <Button
          type="button"
          className="sm:min-w-44"
          disabled={!allChildrenDone}
          onClick={handleComplete}
        >
          Continuar →
        </Button>
      </div>
    </section>
  );
}

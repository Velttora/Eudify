type PensumRow = {
  code: string;
  module: string;
  hours: string;
  description: string;
};

type PensumBlock = {
  blockTitle: string;
  rows: PensumRow[];
};

type FormativePlan = {
  id: string;
  name: string;
  subtitle: string;
  goal: string;
  blocks: PensumBlock[];
};

const PLANS: FormativePlan[] = [
  {
    id: 'acompanamiento',
    name: 'Plan acompañamiento escolar',
    subtitle: 'Primaria y primeros años de secundaria',
    goal:
      'Refuerzo alineado al currículo, hábitos de estudio y comunicación fluida con la familia.',
    blocks: [
      {
        blockTitle: 'Bloque I · Diagnóstico y base',
        rows: [
          {
            code: 'AE-101',
            module: 'Lectura de contexto familiar y escolar',
            hours: '8 h',
            description:
              'Entrevista con la familia, revisión de informes y objetivos compartidos para el trimestre.',
          },
          {
            code: 'AE-102',
            module: 'Competencias lingüísticas y comprensión lectora',
            hours: '24 h',
            description:
              'Estrategias de lectura, vocabulario activo y expresión oral y escrita adaptadas al nivel.',
          },
          {
            code: 'AE-103',
            module: 'Pensamiento lógico y resolución de problemas',
            hours: '20 h',
            description:
              'Matemáticas contextualizadas, secuencias y trabajo con errores como aprendizaje.',
          },
        ],
      },
      {
        blockTitle: 'Bloque II · Profundización',
        rows: [
          {
            code: 'AE-201',
            module: 'Proyectos interdisciplinarios',
            hours: '16 h',
            description:
              'Pequeños proyectos que integran ciencias, lengua y ciudadanía con entregas semanales.',
          },
          {
            code: 'AE-202',
            module: 'Autonomía y organización del tiempo',
            hours: '12 h',
            description:
              'Agenda visual, prioridades y rutinas sostenibles con seguimiento con padres o madres.',
          },
        ],
      },
    ],
  },
  {
    id: 'cuidado',
    name: 'Plan cuidado y estimulación temprana',
    subtitle: '0 a 5 años (con enfoque en desarrollo)',
    goal:
      'Ambientes seguros, juego guiado y hitos de desarrollo respetando el ritmo de cada niño o niña.',
    blocks: [
      {
        blockTitle: 'Bloque I · Bienestar y vínculo',
        rows: [
          {
            code: 'CT-101',
            module: 'Rutinas de sueño, alimentación y juego libre',
            hours: '10 h',
            description:
              'Observación respetuosa, registros simples para la familia y ajustes con criterios pediátricos.',
          },
          {
            code: 'CT-102',
            module: 'Estimulación sensorial y motricidad',
            hours: '18 h',
            description:
              'Propuestas por etapas: gateo, lenguaje corporal, exploración segura del entorno.',
          },
        ],
      },
      {
        blockTitle: 'Bloque II · Lenguaje y socialización',
        rows: [
          {
            code: 'CT-201',
            module: 'Primeras palabras y narración cotidiana',
            hours: '14 h',
            description:
              'Cuentos, rima y conversación dirigida; pautas para reforzar en casa sin presión.',
          },
          {
            code: 'CT-202',
            module: 'Primeros retos de autonomía',
            hours: '10 h',
            description:
              'Habilidades de autocuidado adaptadas a la edad y acuerdos con la familia.',
          },
        ],
      },
    ],
  },
  {
    id: 'idiomas',
    name: 'Plan idiomas y comunicación',
    subtitle: 'Inglés u otros idiomas en entorno familiar',
    goal:
      'Comunicación oral prioritaria, exposición significativa y evaluación por logros observables.',
    blocks: [
      {
        blockTitle: 'Bloque I · Comprensión y confianza',
        rows: [
          {
            code: 'ID-101',
            module: 'Escucha activa y fonética básica',
            hours: '16 h',
            description:
              'Input comprensible, canciones y rutinas cortas en el idioma meta.',
          },
          {
            code: 'ID-102',
            module: 'Producción guiada en situaciones reales',
            hours: '20 h',
            description:
              'Role-play, descripción del día a día y corrección positiva centrada en el mensaje.',
          },
        ],
      },
      {
        blockTitle: 'Bloque II · Proyecto integrador',
        rows: [
          {
            code: 'ID-201',
            module: 'Mini proyecto familiar bilingüe',
            hours: '12 h',
            description:
              'Álbum, podcast corto o cartel con presentación final a la familia.',
          },
        ],
      },
    ],
  },
];

export function FormativePlansSection() {
  return (
    <section
      id="planes"
      className="scroll-mt-4 border-t border-border bg-background py-12 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Oferta formativa
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Planes formativos
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cada plan está organizado en bloques y módulos con código y carga
            horaria orientativa, al estilo de un pensum universitario. Los
            educadores de la plataforma pueden adaptar el ritmo y el detalle a
            tu hogar; aquí ves la estructura de referencia que guía el
            acompañamiento.
          </p>
        </div>

        <div className="mt-12 space-y-14">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border border-border bg-card/80 shadow-sm"
            >
              <header className="border-b border-border bg-linear-to-r from-primary/12 to-card px-5 py-4 sm:px-6 sm:py-5">
                <h3 className="text-lg font-bold text-foreground sm:text-xl">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-primary">
                  {plan.subtitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Objetivo: </span>
                  {plan.goal}
                </p>
              </header>

              <div className="space-y-0 divide-y divide-border">
                {plan.blocks.map((block) => (
                  <div key={block.blockTitle} className="px-3 py-4 sm:px-6 sm:py-5">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {block.blockTitle}
                    </h4>
                    <div className="overflow-x-auto touch-pan-x rounded-xl border border-border bg-background">
                      <table className="min-w-[640px] w-full text-left text-sm">
                        <thead className="bg-muted/70">
                          <tr className="border-b border-border">
                            <th className="px-3 py-2.5 font-semibold text-foreground sm:px-4">
                              Código
                            </th>
                            <th className="px-3 py-2.5 font-semibold text-foreground sm:px-4">
                              Módulo
                            </th>
                            <th className="px-3 py-2.5 font-semibold text-foreground sm:px-4 whitespace-nowrap">
                              Carga
                            </th>
                            <th className="px-3 py-2.5 font-semibold text-foreground sm:px-4">
                              Descripción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row) => (
                            <tr
                              key={row.code}
                              className="border-b border-border/60 last:border-0"
                            >
                              <td className="px-3 py-3 font-mono text-xs font-semibold text-primary sm:px-4 sm:text-sm whitespace-nowrap">
                                {row.code}
                              </td>
                              <td className="px-3 py-3 font-medium text-foreground sm:px-4">
                                {row.module}
                              </td>
                              <td className="px-3 py-3 text-muted-foreground sm:px-4 whitespace-nowrap">
                                {row.hours}
                              </td>
                              <td className="px-3 py-3 text-muted-foreground sm:px-4 leading-snug">
                                {row.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          Los planes son marcos orientativos: el educador que elijas concreta
          sesiones, materiales y evaluación contigo. La contratación y el plan
          activo se formalizarán dentro de la plataforma en próximas versiones.
        </p>
      </div>
    </section>
  );
}

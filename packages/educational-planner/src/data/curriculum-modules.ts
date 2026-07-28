import type { CurriculumModule } from '../domain/types';

/**
 * Los 26 módulos quincenales del Plan Anual Edify.
 * Fuente única: Edify_Framework_Academico_2026.pdf (Documento Interno Edify, v1.0, mayo 2026).
 *
 * Módulos 1–7 (Bloque I): malla curricular completa tal como aparece en el documento
 * (sección 05). Módulos 8–26: el documento solo da nombre + "Foco & Práctica Central"
 * (secciones 06–08, tablas resumen); el resto de campos (objetivo, actividades,
 * indicadores, fundamentación) queda pendiente de expansión — ver `contentStatus`.
 * El pilar principal de los módulos 8–26 no está etiquetado explícitamente en el
 * documento; se infirió del nombre/foco de cada módulo.
 */
export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    number: 1,
    block: 'BLOQUE_I',
    title: 'Mapa de la Familia Edify',
    ageRange: '0–17 años',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    focoPractica:
      'Construir una línea base honesta del estado actual del hogar en los 7 pilares, identificando fortalezas, oportunidades y los 3 hábitos prioritarios del año.',
    objetivoPedagogico:
      'Construir una línea base honesta del estado actual del hogar en los 7 pilares, identificando fortalezas, oportunidades y los 3 hábitos prioritarios del año.',
    actividadesNino: [
      'Identificar mis propios hábitos en cada pilar',
      'Completar el tablero visual Edify',
      'Elegir el primer reto semanal',
      'Cartografiar mi espacio de vida',
    ],
    actividadesFamiliares: [
      'Completar juntos el Mapa Edify (15 min)',
      'Conversar sobre fortalezas y áreas de mejora',
      'Definir 3 compromisos familiares del año',
      'Celebrar lo que ya hacen bien',
    ],
    indicadoresProgreso: [
      'Hábitos actuales identificados en los 7 pilares',
      '3 compromisos familiares escritos y visibles',
      'Tablero Edify activo en casa',
      'Nivel de apertura familiar al cambio',
    ],
    resultadoObservable:
      'La familia tiene un mapa claro de su punto de partida y ha elegido sus primeras 3 metas de forma consciente y colaborativa.',
    fundamentacionCientifica: [
      'AAP: Healthy lifestyle assessment tools',
      'OMS: Nurturing Care Framework',
      'CDC: Wellness screening',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 2,
    block: 'BLOQUE_I',
    title: 'Aire & Descanso — La Base de Todo',
    ageRange: '0–17 años + padres',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P1', 'P3'],
    pilaresSecundarios: ['P6'],
    focoPractica:
      'Establecer una rutina de cierre nocturno libre de pantallas y mejorar la calidad del aire del dormitorio, como base para el sueño reparador del niño.',
    objetivoPedagogico:
      'Establecer una rutina de cierre nocturno libre de pantallas y mejorar la calidad del aire del dormitorio, como base para el sueño reparador del niño.',
    actividadesNino: [
      'Apagar dispositivos 60 min antes de dormir',
      'Abrir ventanas 10 min al despertar',
      'Diseñar mi ritual de sueño propio',
      'Registrar mi calidad de sueño por 7 días',
    ],
    actividadesFamiliares: [
      "Implementar 'zona libre de pantallas' en habitaciones",
      'Crear un ritual de cierre familiar (lectura, conversación, silencio)',
      'Revisar fuentes de humo y ventilación',
      'Instalar cortinas oscurecedoras en dormitorio infantil',
    ],
    indicadoresProgreso: [
      'Noches con dormitorio libre de pantallas (meta: 7/7)',
      'Tiempo promedio de conciliación del sueño',
      'Calidad subjetiva del sueño (escala 1-5)',
      'Horas de sueño efectivas vs. recomendadas',
    ],
    resultadoObservable:
      'El niño duerme en un cuarto sin pantallas, con un ritual consistente. Los padres reportan mejora en facilidad de inicio del sueño en la primera semana.',
    fundamentacionCientifica: [
      'AAP: Healthy Sleep Habits (2022)',
      'Chang et al.: Light before bed delays sleep',
      'CDC: Sleep guidelines',
      'Gradisar: Digital media and sleep in childhood',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 3,
    block: 'BLOQUE_I',
    title: 'Agua como Hábito — El Combustible Silencioso',
    ageRange: '2–17 años',
    durationWeeks: 2,
    difficulty: 1,
    pilarPrincipal: ['P4'],
    pilaresSecundarios: ['P5'],
    focoPractica:
      'Establecer el agua como bebida base del hogar, reducir el consumo de bebidas azucaradas y crear hábitos de hidratación conscientes y adaptados a la edad.',
    objetivoPedagogico:
      'Establecer el agua como bebida base del hogar, reducir el consumo de bebidas azucaradas y crear hábitos de hidratación conscientes y adaptados a la edad.',
    actividadesNino: [
      'Llevar mi botella de agua a todos lados',
      'Aprender a reconocer mis señales de sed',
      'Probar agua con frutas/hierbas naturales',
      'Registrar vasos de agua por día en mi tracker',
    ],
    actividadesFamiliares: [
      "Crear la 'estación de hidratación' familiar (jarra visible, vasos accesibles)",
      'Eliminar bebidas azucaradas durante 2 semanas como experimento',
      'Calcular necesidades de agua de cada miembro',
      'Revisar calidad del agua del grifo',
    ],
    indicadoresProgreso: [
      'Vasos de agua consumidos por día (meta por edad)',
      'Bebidas azucaradas por semana',
      'Presencia de botella de agua personal',
      'Señales de hidratación (labios, orina, energía)',
    ],
    resultadoObservable:
      'El agua es la bebida predominante del hogar. El niño porta su botella y ha reducido al menos 1 bebida azucarada/día.',
    fundamentacionCientifica: [
      'AAP: Recommended drinks children 0-5 (2019)',
      'ESPGHAN: Beverage guidelines',
      'Bar (2007): Water deficit and cognitive performance',
      'OMS: Sugar intake guidelines',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 4,
    block: 'BLOQUE_I',
    title: 'La Mesa que Forma Cerebro',
    ageRange: '2–17 años',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P5'],
    pilaresSecundarios: ['P6'],
    focoPractica:
      'Asegurar al menos una comida familiar compartida diaria como ritual de conexión y nutrición, introduciendo el principio de diversidad alimentaria y participación del niño.',
    objetivoPedagogico:
      'Asegurar al menos una comida familiar compartida diaria como ritual de conexión y nutrición, introduciendo el principio de diversidad alimentaria y participación del niño.',
    actividadesNino: [
      'Participar en la preparación de una comida/semana',
      'Explorar 3 alimentos nuevos sin presión',
      "Diseñar mi 'plato colorido' ideal",
      'Aprender el origen de un alimento favorito',
    ],
    actividadesFamiliares: [
      'Comprometerse con al menos 5 comidas compartidas/semana',
      "Implementar la regla 'color + proteína + fibra' en el plato",
      'Cocinar juntos al menos 1 vez en la quincena',
      'Apagar pantallas en la mesa',
    ],
    indicadoresProgreso: [
      'Comidas compartidas/semana (meta: ≥5)',
      'Diversidad de frutas y verduras/semana',
      'Presencia de pantallas en la mesa (meta: 0)',
      'Participación del niño en cocina',
    ],
    resultadoObservable:
      'La familia comparte al menos 5 comidas/semana sin pantallas. El niño ha probado al menos 3 alimentos nuevos sin presión.',
    fundamentacionCientifica: [
      'Fiese et al.: Family mealtimes and child wellbeing',
      'Hammons & Fiese (2011): Family meals → better nutrition',
      'OMS: Healthy diet',
      'AAP: Raising healthy children',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 5,
    block: 'BLOQUE_I',
    title: 'Emociones con Nombre — La Inteligencia Interior',
    ageRange: '2–12 años',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P6'],
    pilaresSecundarios: ['P7'],
    focoPractica:
      'Instalar 10 minutos diarios de atención exclusiva adulto-niño y desarrollar el vocabulario emocional básico como fundamento de la regulación y el vínculo.',
    objetivoPedagogico:
      'Instalar 10 minutos diarios de atención exclusiva adulto-niño y desarrollar el vocabulario emocional básico como fundamento de la regulación y el vínculo.',
    actividadesNino: [
      'Aprender y usar 10 palabras de emociones nuevas',
      'Practicar el termómetro emocional diario',
      "Diseñar mi 'kit de calma' personal",
      'Leer un libro sobre emociones con un adulto',
    ],
    actividadesFamiliares: [
      'Reservar 10 min de atención exclusiva/día (sin dispositivos, sin distracciones)',
      'Nombrar y validar las emociones del niño sin corregir ni minimizar',
      "Practicar la secuencia 'paro-nombro-acompaño' ante episodios difíciles",
      'Leer cuentos con contenido emocional antes de dormir',
    ],
    indicadoresProgreso: [
      'Minutos de atención exclusiva/día',
      'Frecuencia de uso de vocabulario emocional',
      'Episodios de escalada emocional/semana',
      'Uso de pantallas como regulador (meta: ↓)',
    ],
    resultadoObservable:
      'El niño puede nombrar al menos 5 emociones con precisión. El adulto tiene un ritual diario de atención exclusiva instaurado.',
    fundamentacionCientifica: [
      'Harvard CDC: Serve and Return',
      'Siegel & Bryson: The Whole-Brain Child',
      'Gottman: Raising an Emotionally Intelligent Child',
      'Shonkoff & Phillips: From neurons to neighborhoods',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 6,
    block: 'BLOQUE_I',
    title: 'Moverse para Crecer — El Movimiento como Nutrición',
    ageRange: '2–17 años',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P7'],
    pilaresSecundarios: ['P2'],
    focoPractica:
      'Crear un circuito diario de movimiento variado adaptado a la edad, integrando las habilidades motoras fundamentales (gateo, rodar, trepar, equilibrio, coordinar) como base del desarrollo neurológico.',
    objetivoPedagogico:
      'Crear un circuito diario de movimiento variado adaptado a la edad, integrando las habilidades motoras fundamentales (gateo, rodar, trepar, equilibrio, coordinar) como base del desarrollo neurológico.',
    actividadesNino: [
      'Practicar el circuito Edify 20 min/día',
      'Aprender 3 nuevas formas de moverme',
      'Cronometrar cuánto tiempo permanezco sentado y reducirlo',
      'Hacer una salida activa con adulto/semana',
    ],
    actividadesFamiliares: [
      "Crear el 'circuito Edify' adaptado a espacio del hogar o parque cercano",
      'Reducir tiempo de pantalla en 30 min y reemplazar por movimiento activo',
      'Caminar juntos al menos 20 min/día',
      'Bailar, jugar, moverse en casa sin objetivo deportivo',
    ],
    indicadoresProgreso: [
      'Minutos de movimiento activo/día (meta por edad)',
      'Variedad de patrones motores/semana',
      'Salidas al aire libre/semana',
      'Tiempo sentado ininterrumpido (meta: <30 min)',
    ],
    resultadoObservable:
      'El niño tiene un circuito de movimiento diario instaurado. Los adultos observan mejora en la calidad del sueño y el estado de ánimo.',
    fundamentacionCientifica: [
      'OMS: Physical activity guidelines 5-17 years (2020)',
      'Hillman: Physical activity and cognitive function',
      'AAP: The power of play',
      'Ratey: Spark',
      'Schleip: Fascial Fitness',
    ],
    contentStatus: 'FULL',
  },
  {
    number: 7,
    block: 'BLOQUE_I',
    title: 'Luz de Mañana, Noche Tranquila',
    ageRange: '0–17 años + padres',
    durationWeeks: 2,
    difficulty: 2,
    pilarPrincipal: ['P3'],
    pilaresSecundarios: ['P1', 'P6'],
    focoPractica:
      'Instalar la exposición a luz natural matutina como regulador del ritmo circadiano y reforzar la rutina de sueño con oscuridad progresiva, temperatura y rutinas de cierre.',
    objetivoPedagogico:
      'Instalar la exposición a luz natural matutina como regulador del ritmo circadiano y reforzar la rutina de sueño con oscuridad progresiva, temperatura y rutinas de cierre.',
    actividadesNino: [
      'Salir a tomar luz natural en los primeros 30 min del día',
      'Crear mi rutina de sueño en 5 pasos',
      'Observar cómo cambia mi energía según la luz del día',
      "Diseñar 'mi noche perfecta'",
    ],
    actividadesFamiliares: [
      'Abrir cortinas o salir al exterior en los primeros 30 min del día como familia',
      'Instalar bombillos cálidos/tenues en dormitorios para la noche',
      'Establecer temperatura del dormitorio entre 18-20°C',
      'Revisar y consolidar el ritual de sueño del módulo 2',
    ],
    indicadoresProgreso: [
      'Días con exposición a luz natural matutina (<30 min del despertar)',
      'Consistencia del ritual de sueño',
      'Temperatura del dormitorio documentada',
      'Horas de sueño totales vs. recomendadas',
    ],
    resultadoObservable:
      'La familia tiene una rutina de luz matutina y de cierre nocturno funcional. El niño duerme las horas recomendadas con inicio consistente.',
    fundamentacionCientifica: [
      'Harvard Medical School: Circadian rhythms',
      'Czeisler: Light and the circadian pacemaker',
      'CDC: Sleep guidelines',
      'AAP: Healthy sleep habits',
      'AASM: Pediatric sleep guidelines',
    ],
    contentStatus: 'FULL',
  },

  // Bloque II — Cuerpo & Ambiente (módulos 8–13). Documento solo da nombre + foco central.
  {
    number: 8,
    block: 'BLOQUE_II',
    title: 'Tierra Viva',
    durationWeeks: 2,
    pilarPrincipal: ['P2'],
    focoPractica:
      'Siembra, tierra, insectos, huerta, ciclos naturales. Objetivo: relación con naturaleza, no misticismo.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 9,
    block: 'BLOQUE_II',
    title: 'Casa Respirable',
    durationWeeks: 2,
    pilarPrincipal: ['P1'],
    focoPractica:
      'Auditoría de aire interior: humo, aerosoles, polvo, ventilación. ¿Qué entra a los pulmones del niño?',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 10,
    block: 'BLOQUE_II',
    title: 'Agua y Sales en la Lonchera',
    durationWeeks: 2,
    pilarPrincipal: ['P4', 'P5'],
    focoPractica:
      'Revisar sodio y azúcar en snacks. Lonchera con agua y comida real. Etiquetas y lectura crítica.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 11,
    block: 'BLOQUE_II',
    title: 'Cocina de Participación',
    durationWeeks: 2,
    pilarPrincipal: ['P5'],
    focoPractica:
      'Niño lava, mezcla, sirve, elige. Repetición de exposición sin presión. Cocina como laboratorio.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 12,
    block: 'BLOQUE_II',
    title: 'Calma sin Pantallas',
    durationWeeks: 2,
    pilarPrincipal: ['P6'],
    focoPractica:
      'Rincón de calma. Secuencia paro-nombro-acompaño. Lectura pre-sueño. Reparación post-conflicto.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 13,
    block: 'BLOQUE_II',
    title: 'Postura, Equilibrio y Pausas',
    durationWeeks: 2,
    pilarPrincipal: ['P7'],
    focoPractica:
      'Sedentarismo interrumpido cada 30 min. Mochila y mesa evaluadas. Juego corporal cruzado.',
    contentStatus: 'SUMMARY_ONLY',
  },

  // Bloque III — Autonomía Saludable (módulos 14–20).
  {
    number: 14,
    block: 'BLOQUE_III',
    title: 'Luz, Calor y Escuela',
    durationWeeks: 2,
    pilarPrincipal: ['P3'],
    focoPractica: 'Recreos, gorra, sombra, botella. Ritmo sol-escuela. Protección solar activa.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 15,
    block: 'BLOQUE_III',
    title: 'Tierra y Orden Tecnológico',
    durationWeeks: 2,
    pilarPrincipal: ['P2'],
    focoPractica:
      'Estación de carga fuera del cuarto. Reglas por horario. Naturaleza como compensación.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 16,
    block: 'BLOQUE_III',
    title: 'Aire y Barrio',
    durationWeeks: 2,
    pilarPrincipal: ['P1'],
    focoPractica:
      'Ruta caminable. Parque semanal. Ruido, humo, cuidado del entorno como educación cívica.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 17,
    block: 'BLOQUE_III',
    title: 'Leer la Sed',
    durationWeeks: 2,
    pilarPrincipal: ['P4'],
    focoPractica: 'Señales de sed. Agua antes/después del juego. Higiene de manos. Calidad del agua.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 18,
    block: 'BLOQUE_III',
    title: 'Leer Etiquetas, No Anuncios',
    durationWeeks: 2,
    pilarPrincipal: ['P5'],
    focoPractica:
      'Ingredientes, sodio, azúcar, marketing infantil. Pensamiento crítico sobre el consumo.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 19,
    block: 'BLOQUE_III',
    title: 'Frustración, Gratitud y Reparación',
    durationWeeks: 2,
    pilarPrincipal: ['P6'],
    focoPractica: "Pedir perdón, esperar turno, recibir un 'no', agradecer. Resolver en familia.",
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 20,
    block: 'BLOQUE_III',
    title: 'Fuerza y Coordinación con Gozo',
    durationWeeks: 2,
    pilarPrincipal: ['P7'],
    focoPractica:
      'Baile, carrera, saltos, trepar, lanzar. Alfabetización motora como gozo, no entrenamiento.',
    contentStatus: 'SUMMARY_ONLY',
  },

  // Bloque IV — Comunidad & Cultura (módulos 21–26).
  {
    number: 21,
    block: 'BLOQUE_IV',
    title: 'Ritmo Estable Todo el Año',
    durationWeeks: 2,
    pilarPrincipal: ['P3'],
    focoPractica:
      'Consistencia de sueño en fines de semana. Recuperación de luz matinal. Sin derivas largas.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 22,
    block: 'BLOQUE_IV',
    title: 'Salida de los 4 Elementos',
    durationWeeks: 2,
    pilarPrincipal: ['P1', 'P2', 'P3', 'P4'],
    focoPractica:
      'Parque/finca/río/playa: aire + tierra + luz + agua. Checklist de seguridad. Cero basura.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 23,
    block: 'BLOQUE_IV',
    title: 'Cocina con Memoria',
    durationWeeks: 2,
    pilarPrincipal: ['P5'],
    focoPractica:
      'Receta local/semana. Temporada. Mercado. Ingrediente del territorio. Salud + pertenencia.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 24,
    block: 'BLOQUE_IV',
    title: 'Círculo de Palabra',
    durationWeeks: 2,
    pilarPrincipal: ['P6'],
    focoPractica:
      'Espacio breve semanal: qué disfrutaste, qué te costó, qué necesitas. Escucha y seguridad.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 25,
    block: 'BLOQUE_IV',
    title: 'Fiesta del Movimiento',
    durationWeeks: 2,
    pilarPrincipal: ['P7'],
    focoPractica:
      'Mini-olimpiada familiar. Circuito lúdico. Resistencia + coordinación + balance + cooperación.',
    contentStatus: 'SUMMARY_ONLY',
  },
  {
    number: 26,
    block: 'BLOQUE_IV',
    title: 'Cierre y Renovación',
    durationWeeks: 2,
    pilarPrincipal: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    focoPractica:
      'Repetir línea base. Mostrar avances. Elegir 3 hábitos para el año 2. Certificado Edify.',
    contentStatus: 'SUMMARY_ONLY',
  },
];

export function curriculumModuleByNumber(moduleNumber: number): CurriculumModule | undefined {
  return CURRICULUM_MODULES.find((m) => m.number === moduleNumber);
}

export const TOTAL_CURRICULUM_MODULES = CURRICULUM_MODULES.length;

// Base de conocimiento de OVA-Mentor HITL.
// La comparten la interfaz (navegador) y la función del servidor (api/chat.js),
// de modo que el agente y el estudiante consultan exactamente los mismos criterios.
// Fuente: instrumentos del proyecto "Metodología de producción ágil de OVA con IA
// generativa y HITL" (Doria y Atencia, 2026): F2-A Matriz de Trazabilidad de Prompts,
// F2-B Rúbrica de punto de control HITL y calidad instruccional (Mayer), F1-B/F2-C
// componentes C1–C7, y los principios de aprendizaje multimedia de Mayer (2020).

export const AGENTE = {
  nombre: 'OVA-Mentor HITL',
  version: '1.1.0',
  descripcion:
    'Agente pedagógico inteligente para el acompañamiento socrático y la evaluación formativa en la producción ágil de Objetos Virtuales de Aprendizaje (OVA) en educación superior.',
  autores: 'Marcos Atencia Martínez y Daniel David Doria Díaz',
  programa: 'Maestría en Innovación Educativa con Tecnología e Inteligencia Artificial (MIETIA), Universidad de Córdoba',
  curso: 'IA en Educación II (Cohorte 2) — Unidad 3: Agentes Pedagógicos Inteligentes',
  docente: 'Juan Carlos Giraldo Cardozo',
  advertencia: 'Soy una IA: verifica mis sugerencias y decide tú.',
  limite: 'No tengo base suficiente para esto; consúltalo con tu docente.'
};

// Fases del modelo ágil SAM2 tal como se codifican en la Matriz F2-A.
// El número de versión (V) sigue el ejemplo de F2-A: OVA1-MOD1-V2-P03 corresponde a DIS.
export const FASES = [
  { codigo: 'PREP', v: 1, nombre: 'Preparación (Savvy Start)', corto: 'Savvy Start', frase: 'el Savvy Start (Preparación)',
    proposito: 'Lluvia de ideas, objetivo de aprendizaje y maqueta inicial del OVA.' },
  { codigo: 'DIS', v: 2, nombre: 'Diseño iterativo — Versión Alfa', corto: 'Alfa', frase: 'la versión Alfa (diseño iterativo)',
    proposito: 'Primera versión funcional con guion y pantallas principales.' },
  { codigo: 'DES-B', v: 3, nombre: 'Desarrollo iterativo — Versión Beta', corto: 'Beta', frase: 'la versión Beta (desarrollo iterativo)',
    proposito: 'Versión completa con activos multimedia, lista para revisión de calidad.' },
  { codigo: 'DES-O', v: 4, nombre: 'Desarrollo iterativo — Versión Oro', corto: 'Oro', frase: 'la versión Oro (versión final)',
    proposito: 'Versión final validada por pares, lista para publicar en el LMS.' }
];

// Componentes de producción comunes a F1-B, F2-A y F2-C.
export const COMPONENTES = [
  { codigo: 'C1', nombre: 'Análisis y guion instruccional', incluye: 'Estructura temática, objetivos, guion de pantallas, textos' },
  { codigo: 'C2', nombre: 'Activos visuales', incluye: 'Ilustraciones, infografías, diagramas, interfaz gráfica' },
  { codigo: 'C3', nombre: 'Locución y audio', incluye: 'Grabación o síntesis de voz, edición de audio' },
  { codigo: 'C4', nombre: 'Video y animación', incluye: 'Producción y edición de video, animaciones' },
  { codigo: 'C5', nombre: 'Interactividad y evaluación', incluye: 'Actividades interactivas, cuestionarios, retroalimentación' },
  { codigo: 'C6', nombre: 'Montaje en el LMS', incluye: 'Empaquetado, carga, configuración y pruebas técnicas' },
  { codigo: 'C7', nombre: 'Revisión, aprobación y reprocesos', incluye: 'Revisiones del docente y del diseñador, correcciones, rehechos' }
];

// Rúbrica F2-B (versión 2.0). Escala: 4 cumple plenamente; 3 ajustes menores;
// 2 cumple parcialmente, requiere iterar; 1 no cumple; NA no aplica.
export const RUBRICA = [
  { n: 1, criterio: 'Coherencia', principio: 'coherencia',
    niveles: {
      4: 'Todas las imágenes, sonidos y textos apoyan el objetivo de aprendizaje.',
      3: 'Hay uno o dos elementos decorativos sin efecto relevante en la atención.',
      2: 'Varios elementos decorativos o detalles seductores generados por la IA compiten con el contenido.',
      1: 'Predominan los elementos ajenos al objetivo.' } },
  { n: 2, criterio: 'Contigüidad espacial', principio: 'contiguidad_espacial',
    niveles: {
      4: 'Cada texto explicativo está junto al gráfico que describe.',
      3: 'Algunas etiquetas están separadas, pero se relacionan con facilidad.',
      2: 'Con frecuencia hay que buscar en otra zona de la pantalla el texto de un gráfico.',
      1: 'Textos y gráficos relacionados aparecen en pantallas distintas.' } },
  { n: 3, criterio: 'Contigüidad temporal', principio: 'contiguidad_temporal',
    niveles: {
      4: 'La narración y la imagen que describe aparecen al mismo tiempo.',
      3: 'Desfases breves que no afectan la comprensión.',
      2: 'Desfases frecuentes entre narración e imagen.',
      1: 'La narración y las imágenes se presentan en momentos separados.' } },
  { n: 4, criterio: 'Modalidad', principio: 'modalidad',
    niveles: {
      4: 'Los gráficos y animaciones complejos se explican con narración, no con texto denso en pantalla.',
      3: 'La mayoría usa narración; quedan textos breves de apoyo.',
      2: 'Combinación inconsistente: varias animaciones se explican con bloques de texto.',
      1: 'Las explicaciones de gráficos y animaciones son texto impreso extenso.' } },
  { n: 5, criterio: 'Redundancia', principio: 'redundancia',
    niveles: {
      4: 'No se presenta el mismo texto narrado e impreso a la vez.',
      3: 'Solo se duplican palabras clave o títulos.',
      2: 'Se duplican frases completas en algunas pantallas.',
      1: 'La narración se reproduce textualmente en pantalla de forma sistemática.' } },
  { n: 6, criterio: 'Precisión disciplinar (control de alucinación)', principio: 'ninguno',
    niveles: {
      4: 'Datos, conceptos y citas verificados contra fuentes; sin errores.',
      3: 'Imprecisiones menores de redacción que no alteran el concepto.',
      2: 'Al menos un error conceptual o una cita no verificable.',
      1: 'Varios errores conceptuales o fuentes inexistentes.' } },
  { n: 7, criterio: 'Ausencia de sesgo y lenguaje incluyente', principio: 'ninguno',
    niveles: {
      4: 'Ejemplos, imágenes y lenguaje sin estereotipos y pertinentes al contexto colombiano.',
      3: 'Algún ejemplo poco contextualizado, sin estereotipos.',
      2: 'Presencia de un estereotipo o de ejemplos ajenos al contexto.',
      1: 'Sesgos reiterados en textos o imágenes.' } },
  { n: 8, criterio: 'Alineación instruccional y nivel de maestría', principio: 'ninguno',
    niveles: {
      4: 'Objetivo, contenido, actividad y evaluación coinciden y exigen análisis o aplicación propios del posgrado.',
      3: 'Alineación completa; alguna actividad de nivel cognitivo bajo.',
      2: 'Alguna actividad o evaluación no corresponde al objetivo.',
      1: 'Desconexión entre objetivo, contenido y evaluación.' } },
  { n: 9, criterio: 'Calidad técnica de los activos generados', principio: 'ninguno',
    niveles: {
      4: 'Locución clara y natural; imágenes legibles; navegación sin fallos en el LMS.',
      3: 'Defectos menores que no interrumpen el uso.',
      2: 'Defectos que dificultan seguir el contenido en algunas pantallas.',
      1: 'Defectos que impiden usar el recurso.' } }
];

export const REGLA_DECISION =
  'El elemento se aprueba si ningún criterio tiene valoración 1 o 2 y el criterio 6 (precisión disciplinar) tiene 4. En cualquier otro caso se itera y se registra el motivo en la Matriz de Trazabilidad (F2-A). El promedio de los criterios 1 a 5 es el índice de cumplimiento CTML de la versión.';

// Aplica la regla de decisión de F2-B a un conjunto de valoraciones {1: 4, 2: 3, ...}.
// Devuelve: completo (los 9 criterios tienen valor o NA), decision (APROBADO, ITERAR,
// FALTA_C6 o SIN_DATOS), indiceCTML (promedio criterios 1–5) y promedio general.
export function evaluarRubrica(valores) {
  const v = valores || {};
  const nums = Object.entries(v)
    .filter(([, x]) => typeof x === 'number')
    .map(([k, x]) => [Number(k), x]);
  const completo = RUBRICA.every((c) => v[c.n] !== undefined && v[c.n] !== null && v[c.n] !== '');
  if (!nums.length) return { completo, decision: 'SIN_DATOS', indiceCTML: null, promedio: null, bajos: [] };
  const bajos = nums.filter(([, x]) => x <= 2).map(([k]) => k);
  const c6 = v[6];
  const ctml = nums.filter(([k]) => k >= 1 && k <= 5).map(([, x]) => x);
  const indiceCTML = ctml.length ? ctml.reduce((a, b) => a + b, 0) / ctml.length : null;
  const promedio = nums.reduce((a, [, x]) => a + x, 0) / nums.length;
  let decision;
  if (typeof c6 !== 'number') decision = 'FALTA_C6';
  else if (!bajos.length && c6 === 4) decision = 'APROBADO';
  else decision = 'ITERAR';
  return { completo, decision, indiceCTML, promedio, bajos, c6 };
}

// Principios de aprendizaje multimedia (Mayer, 2020) usados como criterios del agente.
export const PRINCIPIOS = [
  { id: 'coherencia', nombre: 'Coherencia', tipo: 'Reducir procesamiento extrínseco',
    def: 'Se aprende mejor cuando se excluyen palabras, imágenes, sonidos y detalles seductores ajenos al objetivo.',
    pregunta: '¿Qué elemento de esta pantalla podrías quitar sin que el estudiante pierda nada del objetivo?' },
  { id: 'senalizacion', nombre: 'Señalización', tipo: 'Reducir procesamiento extrínseco',
    def: 'Se aprende mejor cuando se resaltan las ideas esenciales y su organización (títulos, flechas, resaltados).',
    pregunta: '¿Cómo sabe el estudiante cuál es la idea más importante de la pantalla?' },
  { id: 'redundancia', nombre: 'Redundancia', tipo: 'Reducir procesamiento extrínseco',
    def: 'Se aprende mejor con gráfico y narración que con gráfico, narración y el mismo texto impreso a la vez.',
    pregunta: 'Si la narración ya lo dice, ¿qué aporta repetirlo palabra por palabra en pantalla?' },
  { id: 'contiguidad_espacial', nombre: 'Contigüidad espacial', tipo: 'Reducir procesamiento extrínseco',
    def: 'Se aprende mejor cuando las palabras y los gráficos correspondientes están cerca en la pantalla.',
    pregunta: '¿Dónde tiene que mirar el estudiante para relacionar cada etiqueta con su parte del gráfico?' },
  { id: 'contiguidad_temporal', nombre: 'Contigüidad temporal', tipo: 'Reducir procesamiento extrínseco',
    def: 'Se aprende mejor cuando la narración y la imagen que describe se presentan al mismo tiempo.',
    pregunta: '¿La voz habla de la imagen justo cuando aparece, o antes o después?' },
  { id: 'segmentacion', nombre: 'Segmentación', tipo: 'Gestionar procesamiento esencial',
    def: 'Se aprende mejor cuando una lección compleja se divide en segmentos que el estudiante avanza a su ritmo.',
    pregunta: '¿En cuántas partes podrías dividir esta explicación y quién controla el paso de una a otra?' },
  { id: 'preentrenamiento', nombre: 'Preentrenamiento', tipo: 'Gestionar procesamiento esencial',
    def: 'Se aprende mejor cuando se conocen antes los nombres y características de los conceptos clave.',
    pregunta: '¿Qué términos necesita conocer el estudiante antes de ver esta animación?' },
  { id: 'modalidad', nombre: 'Modalidad', tipo: 'Gestionar procesamiento esencial',
    def: 'Se aprende mejor con gráficos y narración que con gráficos y texto impreso extenso.',
    pregunta: '¿Esta explicación del gráfico funcionaría mejor escuchada que leída?' },
  { id: 'multimedia', nombre: 'Multimedia', tipo: 'Fomentar procesamiento generativo',
    def: 'Se aprende mejor con palabras e imágenes pertinentes que solo con palabras.',
    pregunta: '¿Qué imagen ayudaría a comprender la idea, no solo a decorar?' },
  { id: 'personalizacion', nombre: 'Personalización', tipo: 'Fomentar procesamiento generativo',
    def: 'Se aprende mejor cuando las palabras tienen un estilo conversacional y no formal.',
    pregunta: '¿El guion le habla al estudiante o le dicta un texto académico?' },
  { id: 'voz', nombre: 'Voz', tipo: 'Fomentar procesamiento generativo',
    def: 'Se aprende mejor con una voz humana y amigable que con una voz con acento mecánico.',
    pregunta: 'Si la locución es sintética, ¿suena natural y con pausas adecuadas?' },
  { id: 'imagen', nombre: 'Imagen', tipo: 'Fomentar procesamiento generativo',
    def: 'Mostrar la imagen del instructor en pantalla no garantiza mejor aprendizaje.',
    pregunta: '¿La presencia del presentador en pantalla aporta algo o distrae del contenido?' }
];

// Códigos de la Matriz de Trazabilidad F2-A.
export const HALLAZGOS = [
  { codigo: 'ALU', nombre: 'Alucinación o dato falso' },
  { codigo: 'SES', nombre: 'Sesgo' },
  { codigo: 'SED', nombre: 'Detalle seductor o elemento decorativo' },
  { codigo: 'RED', nombre: 'Redundancia' },
  { codigo: 'NIV', nombre: 'Nivel cognitivo inadecuado para maestría' },
  { codigo: 'FOR', nombre: 'Formato o lenguaje' },
  { codigo: 'NIN', nombre: 'Ningún problema' }
];

export const DECISIONES = [
  { codigo: 'APR', nombre: 'Aprobar sin cambios' },
  { codigo: 'APM', nombre: 'Aprobar con modificaciones humanas' },
  { codigo: 'ITE', nombre: 'Iterar el prompt' },
  { codigo: 'DES', nombre: 'Descartar' }
];

export const AGENTES_TEC = ['LLM (texto)', 'Generador de imagen', 'Síntesis de voz', 'Generador de video', 'Asistente de código', 'Otro'];

// Encabezados oficiales de la Matriz F2-A, usados en la exportación CSV.
export const COLUMNAS_F2A = [
  'Identificador', 'Fecha', 'Fase SAM2', 'Componente', 'Agente tecnológico', 'Propósito instruccional',
  'Instrucción de entrada (prompt)', 'ROCAS (Sí / No)', 'N.º de intento', 'Respuesta generada (síntesis)',
  'Auditoría y análisis crítico (HITL)', 'Hallazgo HITL', 'Principio de Mayer comprometido',
  'Decisión pedagógica', 'Minutos de revisión humana', 'Fuentes verificadas por el humano'
];

export const PREGUNTAS_REFLEXION = [
  '¿Qué decidiste tú, y no la IA, en esta versión del OVA?',
  '¿Qué principio de aprendizaje multimedia te costó más aplicar y por qué?',
  '¿Qué contenido generado por IA corregiste o descartaste, y cómo lo verificaste?',
  '¿Qué harás distinto en la siguiente versión?'
];

export const TIPOS_INTERVENCION = {
  diagnostico: 'Diagnóstico',
  pregunta_socratica: 'Pregunta socrática',
  pista: 'Pista gradual',
  retroalimentacion: 'Retroalimentación formativa',
  solicitud_evidencia: 'Solicitud de evidencia',
  validacion_humana: 'Validación humana (HITL)',
  cierre: 'Cierre de iteración',
  escalamiento: 'Escalamiento al docente',
  fuera_de_alcance: 'Fuera de alcance'
};

export const FUENTES = {
  rubrica_F2B: 'Rúbrica F2-B',
  principios_mayer: 'Principios de Mayer',
  plantilla_bitacora_F2A: 'Matriz F2-A',
  documento_institucional: 'Documento institucional',
  ninguna: 'Sin fuente de la base'
};

export const RECURSOS_CURSO = [
  { titulo: 'Giraldo Cardozo, J. C. (2026). Agentes Pedagógicos Inteligentes para la innovación educativa con IA generativa', tipo: 'Artículo base del curso',
    nota: 'Disponible en el aula virtual del curso IA en Educación II (Unidad 3).' },
  { titulo: 'Mayer, R. E. (2020). Multimedia learning (3.ª ed.). Cambridge University Press', tipo: 'Fundamento teórico',
    url: 'https://doi.org/10.1017/9781316941355' },
  { titulo: 'Allen, M. W. (2012). Leaving ADDIE for SAM', tipo: 'Modelo ágil SAM', nota: 'ASTD Press.' },
  { titulo: 'UNESCO (2023). Guía para el uso de IA generativa en educación e investigación', tipo: 'Orientación ética',
    url: 'https://doi.org/10.54675/EWZM9535' },
  { titulo: 'Ley Estatutaria 1581 de 2012 — Protección de datos personales (Colombia)', tipo: 'Marco legal',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981' }
];

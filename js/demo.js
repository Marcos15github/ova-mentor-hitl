// Modo demostración: respuestas predefinidas que siguen las mismas reglas del prompt
// ROCAS. Se usa cuando el servidor no tiene IA disponible (sin clave, sin conexión o
// sin cuota) y siempre se etiqueta como «simulado» en la interfaz.
import { RUBRICA, PRINCIPIOS, AGENTE } from '../lib/kb.js';

const R = (respuesta, extra = {}) => ({
  respuesta, tipo_intervencion: 'pregunta_socratica', principio_mayer: 'ninguno', criterio_rubrica: 0,
  fuente: 'principios_mayer', requiere_validacion_humana: false, escalar_docente: false,
  hallazgo_sugerido: 'NA', siguiente_paso: '', ...extra
});

function principioDe(texto) {
  const t = texto.toLowerCase();
  if (/(texto|letras|párrafo|subtítulo).*(narra|voz|audio|locuci)|(narra|voz|audio|locuci).*(texto|letras|párrafo|subtítulo)/.test(t)) return 'redundancia';
  if (/(decorativ|gif|emoji|animaci[oó]n llamativa|adorno|fondo animado|stock|bonit)/.test(t)) return 'coherencia';
  if (/(etiqueta|leyenda|rótulo|lejos|separad|abajo del gráfico|otra pantalla)/.test(t)) return 'contiguidad_espacial';
  if (/(antes de que aparezca|después de|desfase|sincron)/.test(t)) return 'contiguidad_temporal';
  if (/(muy largo|todo en una pantalla|bloque|mucho texto|denso)/.test(t)) return 'segmentacion';
  return null;
}

export function responderDemo(accion, texto = '', ctx = {}) {
  const t = (texto || '').toLowerCase();
  const nivel = Math.min(3, Math.max(1, Number(ctx.nivelPista) || 1));
  const p = principioDe(ctx.ultimoTexto || texto) || 'coherencia';
  const pr = PRINCIPIOS.find((x) => x.id === p);

  if (accion === 'pista') {
    const pistas = {
      1: `Pista 1 de 3: piensa en el principio de **${pr.nombre}**. ${pr.pregunta}`,
      2: `Pista 2 de 3: fíjate en un solo elemento de tu pantalla: el que el estudiante ve primero. ¿Cumple con la ${pr.nombre.toLowerCase()} o compite con el objetivo «${ctx.objetivo || 'de aprendizaje'}»?`,
      3: `Pista 3 de 3, con un ejemplo de otro tema: en un OVA sobre el ciclo del agua, una animación de nubes con lluvia y un texto que repite lo que dice la voz se mejoró quitando el texto y dejando solo tres rótulos junto a cada etapa. ¿Qué cambio equivalente harías tú en tu OVA?`
    };
    return R(pistas[nivel], { tipo_intervencion: 'pista', principio_mayer: p, fuente: 'principios_mayer',
      siguiente_paso: 'Propón un ajuste concreto y explícame por qué lo harías.' });
  }

  if (accion === 'revisar_avance') {
    const vals = ctx.rubrica || {};
    const bajos = Object.entries(vals).filter(([, v]) => typeof v === 'number').sort((a, b) => a[1] - b[1]);
    if (!bajos.length) return R('Aún no veo tu autoevaluación con la rúbrica F2-B. Valora al menos los criterios 1 a 6 de tu versión actual y te ayudo a decidir dónde iterar.',
      { tipo_intervencion: 'solicitud_evidencia', fuente: 'rubrica_F2B', siguiente_paso: 'Completa la autoevaluación F2-B.' });
    const [n, v] = bajos[0];
    const c = RUBRICA.find((x) => String(x.n) === String(n));
    return R(`**Fortaleza:** ya revisaste tu versión con la rúbrica, eso es supervisión humana real.\n**Por mejorar:** el criterio ${n}, ${c.criterio}, quedó en ${v}. El descriptor de nivel 4 dice: «${c.niveles[4]}».\n**Siguiente paso:** elige una pantalla y ajústala solo en ese criterio.\n¿Qué evidencia te haría subir ese criterio a 4? ${AGENTE.advertencia}`,
      { tipo_intervencion: 'retroalimentacion', criterio_rubrica: Number(n), fuente: 'rubrica_F2B', principio_mayer: c.principio,
        siguiente_paso: `Iterar el criterio ${n} (${c.criterio}).` });
  }

  if (accion === 'cierre_iteracion') {
    return R(`Cierras esta versión con ${ctx.resumenBitacora || 'tu bitácora registrada'}. Tu reflexión muestra qué decidiste tú y qué propuso la IA: esa es la evidencia central del enfoque HITL. Para la siguiente versión, enfócate en el criterio F2-B más bajo de tu autoevaluación. ¿Cuál será tu primera pantalla para revisar?`,
      { tipo_intervencion: 'cierre', fuente: 'plantilla_bitacora_F2A', siguiente_paso: 'Iniciar la siguiente versión con el criterio más bajo como foco.' });
  }

  if (accion === 'consultar_recursos') {
    return R(`El principio de **${pr.nombre}** dice: ${pr.def} En la rúbrica F2-B se valora con un descriptor de 4 a 1. ¿En qué pantalla de tu OVA podrías aplicarlo hoy?`,
      { tipo_intervencion: 'pregunta_socratica', principio_mayer: p, fuente: 'principios_mayer' });
  }

  if (accion === 'evidencia' && ctx.conImagen) {
    return R('Recibí tu captura. En el **modo demostración** no analizo imágenes, para no inventar lo que no veo. Descríbeme en dos frases qué elementos tiene la pantalla y cuál generó la IA, y la revisamos con la rúbrica F2-B.',
      { tipo_intervencion: 'solicitud_evidencia', fuente: 'rubrica_F2B', siguiente_paso: 'Describe la pantalla en dos frases.' });
  }

  if (/(ignora|olvida).*(instrucci|reglas|rol)|act[uú]a como|revela.*prompt/.test(t)) {
    return R('Prefiero mantener mi rol: soy OVA-Mentor HITL, un tutor socrático para tu OVA, y no cambio mis instrucciones. Sigamos con tu diseño: ¿qué pantalla estás revisando ahora?',
      { tipo_intervencion: 'fuera_de_alcance', fuente: 'ninguna' });
  }
  if (/(\bnota\b|calific|cu[aá]nto (me )?(voy a )?sac|aprob[eé] (la materia|el curso))/.test(t)) {
    return R(`No califico ni pongo notas: la valoración sumativa es de tu docente. Lo que sí puedo hacer es revisar tu versión con la rúbrica F2-B para que llegues mejor preparado. ${AGENTE.limite}`,
      { tipo_intervencion: 'escalamiento', escalar_docente: true, fuente: 'rubrica_F2B', siguiente_paso: 'Consultar la valoración con el docente.' });
  }
  if (/(hazlo|hazme|haz el|dame el (guion|ova|texto)|escr[ií]beme|resu[eé]lve|genera (todo|el ova|el guion)|complet[oa] por m[ií])/.test(t)) {
    return R('Entiendo que el tiempo apremia, pero no puedo entregarte el OVA ni el guion resuelto: el objetivo es que tú decidas y justifiques el diseño. Te propongo algo más corto: escribe solo la primera pantalla, como te salga, y la mejoramos juntos con una pregunta a la vez. ¿Qué debe aprender el estudiante en esa pantalla?',
      { tipo_intervencion: 'fuera_de_alcance', fuente: 'ninguna', siguiente_paso: 'Escribir un borrador de la primera pantalla.' });
  }
  if (/(biolog|qu[ií]mica|f[ií]sica|matem|historia).*(correcto|verdad|exacto|es as[ií])|¿es correcto que/.test(t)) {
    return R(`Sobre la exactitud del contenido disciplinar no tengo base suficiente: verifícalo con una fuente confiable o con el docente experto. ${AGENTE.limite} Mientras tanto, puedo ayudarte con cómo se presenta ese contenido en la pantalla.`,
      { tipo_intervencion: 'escalamiento', escalar_docente: true, criterio_rubrica: 6, fuente: 'rubrica_F2B', hallazgo_sugerido: 'ALU',
        requiere_validacion_humana: true, siguiente_paso: 'Verificar el dato con una fuente o con el docente experto.' });
  }
  if (texto.trim().split(/\s+/).length < 6) {
    return R('Me falta un poco de información para ayudarte bien. Cuéntame en dos o tres frases: ¿qué hay en la pantalla que estás revisando y qué parte generó la IA?',
      { tipo_intervencion: 'diagnostico', fuente: 'ninguna', siguiente_paso: 'Describir la pantalla y el aporte de la IA.' });
  }
  const pp = principioDe(texto);
  if (pp) {
    const c = RUBRICA.find((x) => x.principio === pp) || RUBRICA[0];
    return R(`**Fortaleza:** identificaste con claridad qué hay en la pantalla.\n**Por mejorar:** según el principio de **${PRINCIPIOS.find((x) => x.id === pp).nombre}**, ${PRINCIPIOS.find((x) => x.id === pp).def.charAt(0).toLowerCase() + PRINCIPIOS.find((x) => x.id === pp).def.slice(1)}\n**Siguiente paso:** decide qué elemento ajustar y regístralo en la bitácora.\n${PRINCIPIOS.find((x) => x.id === pp).pregunta} ${AGENTE.advertencia}`,
      { tipo_intervencion: 'retroalimentacion', principio_mayer: pp, criterio_rubrica: c.n, fuente: 'rubrica_F2B',
        requiere_validacion_humana: true, hallazgo_sugerido: pp === 'redundancia' ? 'RED' : pp === 'coherencia' ? 'SED' : 'FOR',
        siguiente_paso: `Ajustar la pantalla según el criterio ${c.n} y registrar la decisión.` });
  }
  return R('Antes de opinar, quiero entender tu razonamiento: ¿por qué decidiste presentar ese contenido así y no de otra forma? Si parte lo generó la IA, dime qué conservaste y qué cambiaste.',
    { tipo_intervencion: 'pregunta_socratica', fuente: 'principios_mayer', siguiente_paso: 'Justificar la decisión de diseño.' });
}

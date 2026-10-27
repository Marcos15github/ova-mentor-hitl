// Función de servidor (Vercel) que conecta la interfaz con la API de Gemini.
// La clave GEMINI_API_KEY vive solo en las variables de entorno del servidor:
// nunca llega al navegador del estudiante.
import { PROMPT_ROCAS, ESQUEMA_RESPUESTA, instruccionAccion, bloqueContexto, enmascararDatos } from '../lib/prompt.js';

// Orden: los dos primeros compiten en paralelo; el resto es respaldo secuencial.
const MODELOS_RESPALDO = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
const ACCIONES = new Set(['mensaje', 'pista', 'evidencia', 'revisar_avance', 'cierre_iteracion', 'consultar_recursos']);
const MIME_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp']);
const LIMITE_POR_MINUTO = 20;
const visitas = new Map(); // límite de uso básico por instancia

function limiteExcedido(ip) {
  const ahora = Date.now();
  const lista = (visitas.get(ip) || []).filter((t) => ahora - t < 60_000);
  lista.push(ahora);
  visitas.set(ip, lista);
  return lista.length > LIMITE_POR_MINUTO;
}

function recortar(texto, max) {
  const s = String(texto ?? '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Gemini exige turnos alternados user/model: se fusionan turnos consecutivos del mismo rol.
function construirContenidos(historial, ultimoTurno) {
  const turnos = [];
  for (const m of historial) {
    const role = m.rol === 'agente' ? 'model' : 'user';
    const texto = recortar(role === 'user' ? enmascararDatos(m.texto) : m.texto, 2000);
    if (!texto.trim()) continue;
    const prev = turnos[turnos.length - 1];
    if (prev && prev.role === role) prev.parts[0].text += '\n\n' + texto;
    else turnos.push({ role, parts: [{ text: texto }] });
  }
  while (turnos.length && turnos[0].role === 'model') turnos.shift();
  const prev = turnos[turnos.length - 1];
  if (prev && prev.role === 'user') {
    prev.parts[0].text += '\n\n' + ultimoTurno.parts[0].text;
    prev.parts.push(...ultimoTurno.parts.slice(1));
  } else turnos.push(ultimoTurno);
  return turnos;
}

async function llamarGemini(modelo, clave, cuerpo, limiteMs = 22_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1_000, limiteMs));
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(cuerpo),
      signal: ctrl.signal
    });
    const datos = await r.json().catch(() => ({}));
    return { status: r.status, datos };
  } finally {
    clearTimeout(t);
  }
}

function normalizar(obj) {
  const n = (v, def) => (v === undefined || v === null ? def : v);
  return {
    respuesta: String(n(obj.respuesta, '')).trim(),
    tipo_intervencion: n(obj.tipo_intervencion, 'retroalimentacion'),
    principio_mayer: n(obj.principio_mayer, 'ninguno'),
    criterio_rubrica: Math.max(0, Math.min(9, parseInt(n(obj.criterio_rubrica, 0), 10) || 0)),
    fuente: n(obj.fuente, 'ninguna'),
    // Solo se pide validación humana cuando se revisa contenido concreto, no al diagnosticar o dar pistas.
    requiere_validacion_humana: Boolean(obj.requiere_validacion_humana) &&
      !['diagnostico', 'pista', 'pregunta_socratica', 'fuera_de_alcance', 'escalamiento'].includes(obj.tipo_intervencion),
    escalar_docente: Boolean(obj.escalar_docente),
    hallazgo_sugerido: n(obj.hallazgo_sugerido, 'NA'),
    siguiente_paso: String(n(obj.siguiente_paso, '')).trim()
  };
}

function extraerJSON(texto) {
  try { return JSON.parse(texto); } catch { /* sigue */ }
  const m = String(texto).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* sigue */ } }
  return { respuesta: String(texto || '').trim() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return res.status(503).json({ ok: false, code: 'SIN_CLAVE', error: 'El servidor no tiene configurada la clave de Gemini.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  if (limiteExcedido(ip)) return res.status(429).json({ ok: false, code: 'LIMITE', error: 'Demasiadas solicitudes seguidas. Espera un minuto.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const accion = ACCIONES.has(body.accion) ? body.accion : 'mensaje';
  const texto = recortar(enmascararDatos(body.texto || ''), 4000);
  const historial = Array.isArray(body.historial) ? body.historial.slice(-16) : [];
  const contexto = typeof body.contexto === 'object' && body.contexto ? body.contexto : {};

  const partes = [{
    text: [bloqueContexto(contexto), instruccionAccion(accion, contexto),
      texto ? `Mensaje del estudiante:\n${texto}` : '(El estudiante no escribió texto en este turno.)'].filter(Boolean).join('\n\n')
  }];

  if (body.imagen && MIME_IMAGEN.has(body.imagen.mimeType) && typeof body.imagen.data === 'string') {
    if (body.imagen.data.length > 3_500_000) return res.status(413).json({ ok: false, code: 'IMAGEN', error: 'La imagen es demasiado grande (máximo 2,5 MB).' });
    partes.push({ inlineData: { mimeType: body.imagen.mimeType, data: body.imagen.data } });
  }

  const cuerpo = {
    systemInstruction: { parts: [{ text: PROMPT_ROCAS }] },
    contents: construirContenidos(historial, { role: 'user', parts: partes }),
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA_RESPUESTA
    }
  };

  const modelos = [process.env.GEMINI_MODEL, ...MODELOS_RESPALDO].filter(Boolean)
    .filter((m, i, a) => a.indexOf(m) === i);
  const inicio = Date.now();
  const PRESUPUESTO_MS = 52_000; // la función tiene 60 s como máximo en Vercel
  const intentos = [];
  const restante = () => PRESUPUESTO_MS - (Date.now() - inicio);

  // Intenta un modelo; resuelve con la respuesta normalizada o rechaza con el motivo.
  async function intentar(modelo, limite) {
    const conRazonamientoBajo = { ...cuerpo, generationConfig: { ...cuerpo.generationConfig, thinkingConfig: { thinkingLevel: 'low' } } };
    let r;
    try {
      r = await llamarGemini(modelo, clave, conRazonamientoBajo, limite);
      if (r.status === 400 && /thinking/i.test(r.datos?.error?.message || '')) r = await llamarGemini(modelo, clave, cuerpo, Math.min(limite, restante()));
    } catch (e) {
      const motivo = e.name === 'AbortError' ? 'TIEMPO' : 'RED';
      intentos.push({ modelo, status: 0, motivo });
      throw new Error(motivo === 'TIEMPO' ? 'El modelo tardó demasiado en responder.' : e.message);
    }
    if (r.status !== 200) {
      intentos.push({ modelo, status: r.status, motivo: String(r.datos?.error?.status || '').slice(0, 40) });
      const err = new Error(r.datos?.error?.message || `Error ${r.status}`);
      err.fatal = r.status === 401 || r.status === 403;
      throw err;
    }
    const cand = r.datos.candidates?.[0];
    const txt = cand?.content?.parts?.map((p) => p.text || '').join('') || '';
    const data = txt ? normalizar(extraerJSON(txt)) : null;
    if (!data?.respuesta) {
      intentos.push({ modelo, status: 200, motivo: cand?.finishReason || 'VACIA' });
      throw new Error(cand?.finishReason === 'SAFETY' ? 'El modelo bloqueó la respuesta por seguridad.' : 'El modelo devolvió una respuesta vacía.');
    }
    return { data, modelo };
  }

  let ultimoError = 'Sin respuesta del modelo.';
  // 1) Los dos primeros modelos compiten en paralelo: gana la primera respuesta válida.
  try {
    const { data, modelo } = await Promise.any(modelos.slice(0, 2).map((m) => intentar(m, Math.min(24_000, restante()))));
    return res.status(200).json({ ok: true, data, modelo, ms: Date.now() - inicio, intentos });
  } catch (agg) {
    const errores = agg.errors || [agg];
    ultimoError = errores.at(-1)?.message || ultimoError;
    if (errores.some((e) => e.fatal)) return res.status(502).json({ ok: false, code: 'CLAVE', error: 'La clave de Gemini no es válida o no tiene permisos.', intentos });
  }
  // 2) Respaldo secuencial con el tiempo que quede.
  for (const modelo of modelos.slice(2)) {
    if (restante() < 4_000) { ultimoError = 'Se agotó el tiempo de espera de los modelos.'; break; }
    try {
      const { data } = await intentar(modelo, Math.min(20_000, restante()));
      return res.status(200).json({ ok: true, data, modelo, ms: Date.now() - inicio, intentos });
    } catch (e) {
      ultimoError = e.message;
      if (e.fatal) break;
    }
  }
  return res.status(502).json({ ok: false, code: 'MODELO', error: ultimoError, intentos });
}

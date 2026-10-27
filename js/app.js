// OVA-Mentor HITL — lógica de la interfaz.
import { AGENTE, FASES, COMPONENTES, RUBRICA, PRINCIPIOS, HALLAZGOS, DECISIONES, AGENTES_TEC, REGLA_DECISION,
  PREGUNTAS_REFLEXION, TIPOS_INTERVENCION, FUENTES, RECURSOS_CURSO, evaluarRubrica } from '../lib/kb.js';
import { $, $$, escapar, markdown, nuevoId, horaCorta, fechaHora, aviso, prepararImagen } from './util.js';
import { detectarDatos, enmascarar } from './privacidad.js';
import { leerLocal, guardarLocal, borrarLocal, Nube } from './store.js';
import { responderDemo } from './demo.js';
import { exportarCSVBitacora, exportarCSVChat, exportarPDF, exportarJSON, resumenPorVersion } from './exportar.js';

let estado = null;
let modo = 'demo';           // 'ia' cuando el servidor tiene clave de Gemini
let modeloServidor = '';
let adjunto = null;          // imagen preparada para el siguiente envío
let ocupado = false;
const nube = new Nube();
const MAX_PISTAS = 3;

// ---------- Arranque ----------
document.addEventListener('DOMContentLoaded', async () => {
  poblarSelects();
  pintarRecursos();
  pintarFases();
  enlazarEventos();
  const previo = leerLocal();
  if (previo?.sesionId) $('#btn-continuar').hidden = false;
  await Promise.all([comprobarServidor(), iniciarNube()]);
});

async function comprobarServidor() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const s = await r.json();
    modo = s.ia ? 'ia' : 'demo';
    modeloServidor = s.modelo || '';
  } catch { modo = 'demo'; }
  const chip = $('#estado-ia');
  chip.hidden = false;
  chip.textContent = modo === 'ia' ? 'IA conectada' : 'Modo demostración';
  chip.classList.toggle('demo', modo !== 'ia');
  chip.title = modo === 'ia' ? `Respuestas generadas por ${modeloServidor}` : 'El servidor no tiene IA disponible: las respuestas son predefinidas y se marcan como simuladas.';
}

async function iniciarNube() {
  const ok = await nube.iniciar();
  actualizarEstadoGuardado();
  return ok;
}

function actualizarEstadoGuardado(error) {
  const el = $('#estado-guardado');
  if (!estado) { el.textContent = nube.activa ? 'Nube lista' : 'Sin sesión'; return; }
  if (error || nube.error) el.textContent = 'Copia local (la nube no respondió)';
  else el.textContent = nube.activa ? 'Guardado en la nube y en este navegador' : 'Guardado en este navegador';
}

// ---------- Utilidades de estado ----------
const faseActual = () => FASES.find((f) => f.codigo === estado.fase);
const componenteNombre = (c) => COMPONENTES.find((x) => x.codigo === c)?.nombre || c;
const nomPrincipio = (id) => PRINCIPIOS.find((p) => p.id === id)?.nombre;

function persistir({ mensaje, registro, version } = {}) {
  guardarLocal(estado);
  if (nube.activa) {
    const meta = { alias: estado.alias, ova: estado.ova, fase: estado.fase, componente: estado.componente, creado: estado.creado,
      consentimiento: estado.consentimiento, totalMensajes: estado.mensajes.length, totalRegistros: estado.bitacora.length, modo };
    const ops = [nube.guardarSesion(meta)];
    if (mensaje) ops.push(nube.guardarItem('mensajes', mensaje.id, mensaje));
    if (registro) ops.push(nube.guardarItem('bitacora', registro.id, registro));
    if (version) ops.push(nube.guardarItem('versiones', version, { codigo: version, ...estado.versiones[version] }));
    Promise.all(ops).then(() => actualizarEstadoGuardado(), () => actualizarEstadoGuardado(true));
  } else actualizarEstadoGuardado();
}

function resumenBitacoraTexto() {
  const regs = estado.bitacora.filter((b) => b.fase === estado.fase);
  if (!regs.length) return 'sin registros en esta versión';
  const c = (k, v) => regs.filter((b) => b[k] === v).length;
  return `${regs.length} registros en ${faseActual().corto}: APR ${c('decision', 'APR')}, APM ${c('decision', 'APM')}, ITE ${c('decision', 'ITE')}, DES ${c('decision', 'DES')}; hallazgos ALU ${c('hallazgo', 'ALU')}, SES ${c('hallazgo', 'SES')}, SED ${c('hallazgo', 'SED')}, RED ${c('hallazgo', 'RED')}`;
}

function contexto(extra = {}) {
  const rub = estado.versiones[estado.fase]?.rubrica || {};
  const ev = evaluarRubrica(rub);
  return {
    alias: estado.alias, tema: estado.ova.tema, objetivo: estado.ova.objetivo, fase: estado.fase,
    componente: `${estado.componente} ${componenteNombre(estado.componente)}`, pistasUsadas: estado.pista.nivel,
    rubrica: rub, decisionRubrica: ev.decision !== 'SIN_DATOS' ? ev.decision : '', resumenBitacora: resumenBitacoraTexto(), ...extra
  };
}

// ---------- Inicio de sesión ----------
function crearEstado(datos) {
  const ahora = Date.now();
  const versiones = {};
  for (const f of FASES) versiones[f.codigo] = { inicio: null, rubrica: {}, reflexion: null, cierre: null };
  versiones[datos.fase].inicio = ahora;
  return {
    v: 1, sesionId: nuevoId('s'), creado: ahora, alias: datos.alias.trim(),
    consentimiento: { aceptado: true, ts: ahora, texto: 'IA declarada; verificación humana; tratamiento de datos según Ley 1581 de 2012.' },
    ova: { tema: datos.tema.trim(), objetivo: datos.objetivo.trim(), num: 1, modulo: 1 },
    fase: datos.fase, componente: datos.componente, mensajes: [], bitacora: [], versiones, pista: { nivel: 0 }
  };
}

function saludoInicial() {
  const f = faseActual();
  return `Hola, ${estado.alias}. Soy **OVA-Mentor**, una IA. Te acompaño en tu OVA sobre «${estado.ova.tema}» y **tu docente decide la valoración**.\n` +
    `Veo que estás en **${f.frase}** trabajando en ${estado.componente} (${componenteNombre(estado.componente)}).\n` +
    'Para empezar, dos preguntas: ¿qué parte de lo que llevas la generó la IA y qué decidiste tú? ¿Qué pantalla o fragmento quieres revisar primero?\n' +
    AGENTE.advertencia;
}

function iniciarSesion(ev) {
  ev.preventDefault();
  const f = ev.target;
  const datos = Object.fromEntries(new FormData(f).entries());
  const err = $('#error-inicio');
  const faltan = [];
  if (!datos.alias?.trim()) faltan.push('seudónimo');
  if (!datos.tema?.trim()) faltan.push('tema del OVA');
  if (!datos.objetivo?.trim()) faltan.push('objetivo de aprendizaje');
  if (!f.consent.checked) faltan.push('aceptación del uso responsable');
  if (faltan.length) { err.textContent = 'Falta: ' + faltan.join(', ') + '.'; err.hidden = false; return; }
  const personales = detectarDatos(`${datos.alias} ${datos.tema} ${datos.objetivo}`);
  if (personales.length) { err.textContent = `Parece que incluiste un dato personal (${personales.join(', ')}). Usa un seudónimo y quita ese dato.`; err.hidden = false; return; }
  err.hidden = true;
  estado = crearEstado(datos);
  agregarMensaje({ rol: 'agente', texto: saludoInicial(), meta: { tipo_intervencion: 'diagnostico', fuente: 'ninguna', siguiente_paso: 'Cuéntame qué generó la IA y qué decidiste tú.' }, local: true });
  agregarMensaje({ rol: 'sistema', texto: `Sesión iniciada · ${modo === 'ia' ? 'IA conectada' : 'modo demostración (respuestas predefinidas)'} · ${nube.activa ? 'bitácora en la nube' : 'bitácora en este navegador'}` });
  mostrarSesion();
}

function continuarSesion() {
  const previo = leerLocal();
  if (!previo) return;
  estado = previo;
  mostrarSesion();
  agregarMensaje({ rol: 'sistema', texto: `Sesión retomada el ${fechaHora(Date.now())}.` });
}

function mostrarSesion() {
  document.body.dataset.sesion = 'si';
  $('#inicio').hidden = true;
  $('#mensajes').hidden = false;
  $('#entrada').hidden = false;
  ['#btn-exportar', '#btn-registrar', '#btn-avance', '#btn-recursos'].forEach((s) => { $(s).disabled = false; });
  $('#codigo-sesion').textContent = 'Sesión ' + estado.sesionId.slice(-8).toUpperCase();
  pintarMensajes();
  pintarProgreso();
  actualizarPistas();
  persistir();
  $('#texto').focus();
}

// ---------- Mensajes ----------
function agregarMensaje({ rol, texto, meta = null, demo = false, modelo = '', adjunto: conAdjunto = false, vista = null, local = false }) {
  const m = { id: nuevoId('m'), rol, texto, ts: Date.now(), fase: estado.fase, meta, demo, modelo, adjunto: conAdjunto, local };
  estado.mensajes.push(m);
  pintarMensaje(m, vista);
  persistir({ mensaje: m });
  return m;
}

function pintarMensajes() {
  $('#mensajes').innerHTML = '';
  estado.mensajes.forEach((m) => pintarMensaje(m));
}

function pintarMensaje(m, vista = null) {
  const li = document.createElement('li');
  li.className = `msj msj-${m.rol}`;
  li.dataset.id = m.id;
  if (m.rol === 'sistema') {
    li.innerHTML = `<div class="burbuja">${escapar(m.texto)}</div>`;
  } else {
    const autor = m.rol === 'agente' ? 'OVA-Mentor (IA)' : escapar(estado.alias);
    let html = `<span class="sr-only">${autor} dice:</span><div class="burbuja">${markdown(m.texto)}`;
    if (vista) html += `<img class="adjunto" src="${vista}" alt="Captura adjunta por el estudiante">`;
    else if (m.adjunto) html += '<p class="nota">Captura adjunta (no se almacena por minimización de datos).</p>';
    html += '</div>';
    const meta = m.meta || {};
    const chips = [];
    if (m.rol === 'agente') {
      if (meta.tipo_intervencion) chips.push(`<span class="chip">${escapar(TIPOS_INTERVENCION[meta.tipo_intervencion] || meta.tipo_intervencion)}</span>`);
      const apoyo = [];
      if (meta.fuente && meta.fuente !== 'ninguna') apoyo.push(FUENTES[meta.fuente] || meta.fuente);
      if (meta.criterio_rubrica) apoyo.push(`criterio ${meta.criterio_rubrica} (${RUBRICA.find((c) => c.n === meta.criterio_rubrica)?.criterio || ''})`);
      if (meta.principio_mayer && meta.principio_mayer !== 'ninguno') apoyo.push(`principio de ${(nomPrincipio(meta.principio_mayer) || meta.principio_mayer).toLowerCase()}`);
      if (apoyo.length) chips.push(`<span class="chip" title="Base de conocimiento en la que se apoya la respuesta">Se apoya en: ${escapar(apoyo.join(' · '))}</span>`);
      if (meta.requiere_validacion_humana) chips.push('<span class="chip validar">Requiere tu validación humana</span>');
      if (m.demo) chips.push('<span class="chip demo" title="Respuesta predefinida, sin IA">Simulado</span>');
    }
    html += `<div class="msj-meta"><span>${autor} · ${horaCorta(m.ts)}</span>${chips.join('')}</div>`;
    if (m.rol === 'agente' && meta.siguiente_paso) html += `<div class="siguiente-paso"><strong>Siguiente paso:</strong> ${escapar(meta.siguiente_paso)}</div>`;
    if (m.rol === 'agente' && meta.requiere_validacion_humana) {
      html += `<div class="msj-acciones"><button type="button" class="btn btn-sec btn-peq" data-registrar="${m.id}">Registrar mi decisión HITL</button></div>`;
    }
    li.innerHTML = html;
  }
  $('#mensajes').appendChild(li);
  li.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function historial() {
  return estado.mensajes.filter((m) => m.rol !== 'sistema').slice(-12).map((m) => ({ rol: m.rol, texto: m.texto }));
}

async function pedirAgente(accion, texto, extraCtx = {}, imagen = null) {
  ocupado = true;
  $('#escribiendo').hidden = false;
  $('#btn-enviar').disabled = true;
  $('#btn-pista').disabled = true;
  const ctx = contexto(extraCtx);
  const hist = historial().slice(0, -1); // el último turno del estudiante va en «texto»
  let resultado = null;
  if (modo === 'ia') {
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, texto, historial: hist, contexto: { ...ctx, nivelPista: estado.pista.nivel }, imagen })
      });
      const datos = await r.json().catch(() => ({}));
      if (r.ok && datos.ok) resultado = { meta: datos.data, demo: false, modelo: datos.modelo };
      else throw new Error(datos.error || `Error ${r.status}`);
    } catch (e) {
      agregarMensaje({ rol: 'sistema', texto: `No pude conectar con la IA (${e.message}). Respondo en modo demostración; la respuesta queda marcada como simulada.` });
    }
  }
  if (!resultado) {
    await new Promise((res) => setTimeout(res, 450));
    const ultimo = [...estado.mensajes].reverse().find((m) => m.rol === 'estudiante' && !/^Solicito la pista/.test(m.texto));
    resultado = { meta: responderDemo(accion, texto, { ...ctx, nivelPista: estado.pista.nivel, ultimoTexto: ultimo?.texto || '', conImagen: Boolean(imagen) }), demo: true, modelo: 'demo' };
  }
  const { respuesta, ...meta } = resultado.meta;
  agregarMensaje({ rol: 'agente', texto: respuesta, meta, demo: resultado.demo, modelo: resultado.modelo });
  $('#aviso-docente').hidden = !meta.escalar_docente;
  $('#escribiendo').hidden = true;
  ocupado = false;
  $('#btn-enviar').disabled = false;
  actualizarPistas();
}

// ---------- Envío del estudiante ----------
let envioPendiente = null;
async function enviar(ev) {
  ev?.preventDefault();
  if (ocupado) return;
  const campo = $('#texto');
  let texto = campo.value.trim();
  if (!texto && !adjunto) { aviso('Escribe tu respuesta o adjunta una captura.'); campo.focus(); return; }
  const datos = detectarDatos(texto);
  if (datos.length) {
    envioPendiente = texto;
    $('#priv-detectado').textContent = datos.join(', ');
    $('#dlg-privacidad').showModal();
    return;
  }
  await enviarConfirmado(texto);
}

async function enviarConfirmado(texto) {
  const campo = $('#texto');
  const img = adjunto;
  campo.value = '';
  quitarAdjunto();
  $('#aviso-docente').hidden = true;
  const textoMostrado = texto || '(Adjunto una captura de mi pantalla para revisión.)';
  agregarMensaje({ rol: 'estudiante', texto: textoMostrado, adjunto: Boolean(img), vista: img?.vista });
  // Al presentar una nueva propuesta, las pistas del tema anterior se reinician.
  estado.pista.nivel = 0;
  actualizarPistas();
  await pedirAgente(img ? 'evidencia' : 'mensaje', textoMostrado, {}, img ? { mimeType: img.mimeType, data: img.data } : null);
}

async function solicitarPista() {
  if (ocupado) return;
  if (estado.pista.nivel >= MAX_PISTAS) { aviso('Ya usaste las 3 pistas. Intenta una propuesta propia o consulta a tu docente.'); return; }
  estado.pista.nivel += 1;
  actualizarPistas();
  const t = `Solicito la pista ${estado.pista.nivel} de ${MAX_PISTAS}.`;
  agregarMensaje({ rol: 'estudiante', texto: t });
  await pedirAgente('pista', t);
}

function actualizarPistas() {
  if (!estado) return;
  const n = estado.pista.nivel;
  $('#nivel-pista').textContent = `Pistas: ${n} de ${MAX_PISTAS}`;
  $('#btn-pista').disabled = ocupado || n >= MAX_PISTAS;
  $('#btn-pista').title = n >= MAX_PISTAS ? 'Ya usaste las 3 pistas de este tema' : 'Recibe una pista gradual, nunca la solución';
}

async function adjuntar(ev) {
  const archivo = ev.target.files?.[0];
  ev.target.value = '';
  if (!archivo) return;
  try {
    adjunto = await prepararImagen(archivo);
    $('#adjunto-img').src = adjunto.vista;
    $('#adjunto-info').textContent = `Captura lista (${adjunto.ancho}×${adjunto.alto}, ${adjunto.kb} KB). No se guarda en la bitácora.`;
    $('#adjunto-previo').hidden = false;
  } catch (e) { aviso(e.message); }
}
function quitarAdjunto() { adjunto = null; $('#adjunto-previo').hidden = true; $('#adjunto-img').removeAttribute('src'); }

// ---------- Progreso ----------
function pintarFases() {
  $('#fases').innerHTML = FASES.map((f) => `<li class="fase" data-fase="${f.codigo}"><strong>${escapar(f.corto)}</strong>V${f.v} · ${f.codigo}</li>`).join('');
}

function pintarProgreso() {
  if (!estado) return;
  const idx = FASES.findIndex((f) => f.codigo === estado.fase);
  $$('#fases .fase').forEach((li, i) => {
    li.classList.toggle('actual', i === idx);
    li.classList.toggle('hecha', Boolean(estado.versiones[FASES[i].codigo]?.cierre) && i !== idx);
    li.setAttribute('aria-current', i === idx ? 'step' : 'false');
  });
  $('#ova-resumen').innerHTML = `<strong>${escapar(estado.ova.tema)}</strong><br>${escapar(faseActual().nombre)} · ${escapar(estado.componente)} ${escapar(componenteNombre(estado.componente))}`;
  const regs = estado.bitacora;
  $('#ind-registros').textContent = regs.length;
  const ajustes = regs.filter((b) => ['APM', 'ITE', 'DES'].includes(b.decision)).length;
  $('#ind-ajustes').textContent = regs.length ? Math.round((ajustes / regs.length) * 100) + ' %' : '—';
  const ev = evaluarRubrica(estado.versiones[estado.fase]?.rubrica);
  $('#ind-ctml').textContent = ev.indiceCTML ? ev.indiceCTML.toFixed(2) : '—';
  $('#ind-minutos').textContent = regs.reduce((a, b) => a + (Number(b.minutos) || 0), 0);
  const colores = { APR: 'var(--c-apr)', APM: 'var(--c-apm)', ITE: 'var(--c-ite)', DES: 'var(--c-des)' };
  $('#barra-decisiones').innerHTML = DECISIONES.map((d) => {
    const n = regs.filter((b) => b.decision === d.codigo).length;
    return n ? `<span style="flex:${n};background:${colores[d.codigo]}"></span>` : '';
  }).join('');
  $('#leyenda-decisiones').innerHTML = regs.length
    ? DECISIONES.map((d) => `<i style="background:${colores[d.codigo]}"></i>${d.codigo} ${regs.filter((b) => b.decision === d.codigo).length}`).join('')
    : 'Aún no hay decisiones HITL registradas.';
}

// ---------- Recursos ----------
function pintarRecursos() {
  const rub = RUBRICA.map((c) => `<li><strong>${c.n}. ${escapar(c.criterio)}</strong><br><span class="nota">4: ${escapar(c.niveles[4])}</span></li>`).join('');
  const pri = PRINCIPIOS.map((p) => `<li><strong>${escapar(p.nombre)}</strong> — ${escapar(p.def)} <button type="button" class="btn-texto" data-preguntar="${p.id}">Preguntar al agente</button></li>`).join('');
  const hall = HALLAZGOS.map((h) => `<tr><td><strong>${h.codigo}</strong></td><td>${escapar(h.nombre)}</td></tr>`).join('');
  const dec = DECISIONES.map((d) => `<tr><td><strong>${d.codigo}</strong></td><td>${escapar(d.nombre)}</td></tr>`).join('');
  const comp = COMPONENTES.map((c) => `<tr><td><strong>${c.codigo}</strong></td><td>${escapar(c.nombre)}</td></tr>`).join('');
  const docs = RECURSOS_CURSO.map((r) => `<li>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${escapar(r.titulo)}</a>` : escapar(r.titulo)}<br><span class="nota">${escapar(r.tipo)}${r.nota ? ' · ' + escapar(r.nota) : ''}</span></li>`).join('');
  $('#recursos').innerHTML = `
    <details open><summary>Rúbrica F2-B de calidad instruccional</summary><div class="cuerpo"><ul>${rub}</ul><p class="nota">${escapar(REGLA_DECISION)}</p></div></details>
    <details><summary>Principios de aprendizaje multimedia (Mayer)</summary><div class="cuerpo"><ul>${pri}</ul></div></details>
    <details><summary>Plantilla de bitácora HITL (Matriz F2-A)</summary><div class="cuerpo">
      <p>Identificador: <code>OVA[n]-MOD[n]-V[versión]-P[prompt]</code>. Registra cada interacción significativa con la IA en el momento en que ocurre.</p>
      <table class="mini-tabla"><caption class="sr-only">Hallazgos</caption><thead><tr><th>Hallazgo</th><th>Significado</th></tr></thead><tbody>${hall}</tbody></table><br>
      <table class="mini-tabla"><caption class="sr-only">Decisiones</caption><thead><tr><th>Decisión</th><th>Significado</th></tr></thead><tbody>${dec}</tbody></table><br>
      <table class="mini-tabla"><caption class="sr-only">Componentes</caption><thead><tr><th>Código</th><th>Componente</th></tr></thead><tbody>${comp}</tbody></table>
    </div></details>
    <details><summary>Documentos del curso y marco ético</summary><div class="cuerpo"><ul>${docs}</ul></div></details>`;
}

function consultarRecursos() {
  if (matchMedia('(max-width: 960px)').matches) cambiarPestana('recursos');
  const panel = $('[data-zona="recursos"]');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  panel.querySelector('summary')?.focus();
}

async function preguntarPrincipio(id) {
  if (!estado || ocupado) return;
  const p = PRINCIPIOS.find((x) => x.id === id);
  if (matchMedia('(max-width: 960px)').matches) cambiarPestana('chat');
  const t = `¿Cómo aplico el principio de ${p.nombre} en mi OVA?`;
  agregarMensaje({ rol: 'estudiante', texto: t });
  await pedirAgente('consultar_recursos', t);
}

// ---------- Registro HITL ----------
function poblarSelects() {
  const opts = (arr, val, txt) => arr.map((x) => `<option value="${escapar(val(x))}">${escapar(txt(x))}</option>`).join('');
  const comp = opts(COMPONENTES, (c) => c.codigo, (c) => `${c.codigo} · ${c.nombre}`);
  $('#sel-componente').innerHTML = comp;
  const f = $('#form-hitl');
  f.componente.innerHTML = comp;
  f.agente.innerHTML = opts(AGENTES_TEC, (a) => a, (a) => a);
  f.hallazgo.innerHTML = opts(HALLAZGOS, (h) => h.codigo, (h) => `${h.codigo} · ${h.nombre}`);
  f.principio.innerHTML = '<option value="ninguno">No aplica</option>' + opts(PRINCIPIOS, (p) => p.id, (p) => p.nombre);
  $('#opciones-decision').innerHTML = DECISIONES.map((d, i) =>
    `<label class="opcion-decision"><input type="radio" name="decision" value="${d.codigo}" ${i === 1 ? 'checked' : ''}><span><strong>${d.codigo}</strong><br>${escapar(d.nombre)}</span></label>`).join('');
}

function siguienteIdentificador() {
  const f = faseActual();
  const n = estado.bitacora.filter((b) => b.fase === estado.fase).length + 1;
  return `OVA${estado.ova.num}-MOD${estado.ova.modulo}-V${f.v}-P${String(n).padStart(2, '0')}`;
}

function abrirRegistro(mensajeId = null) {
  if (!estado) return;
  const f = $('#form-hitl');
  f.reset();
  $('#error-hitl').hidden = true;
  f.identificador.value = siguienteIdentificador();
  f.componente.value = estado.componente;
  f.dataset.mensaje = mensajeId || '';
  const m = mensajeId ? estado.mensajes.find((x) => x.id === mensajeId) : [...estado.mensajes].reverse().find((x) => x.rol === 'agente' && x.meta?.requiere_validacion_humana);
  if (m?.meta) {
    if (m.meta.hallazgo_sugerido && m.meta.hallazgo_sugerido !== 'NA') f.hallazgo.value = m.meta.hallazgo_sugerido;
    if (m.meta.principio_mayer) f.principio.value = m.meta.principio_mayer;
    f.sintesis.placeholder = 'Síntesis de lo que generó la IA que revisaste';
  }
  $('#dlg-hitl').showModal();
  f.proposito.focus();
}

function guardarRegistro(ev) {
  const f = $('#form-hitl');
  if (ev.submitter?.value !== 'ok') return;
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(f).entries());
  const err = $('#error-hitl');
  if (!d.proposito?.trim() || !d.auditoria?.trim()) { err.textContent = 'Completa el propósito instruccional y la auditoría HITL: son el núcleo del registro.'; err.hidden = false; return; }
  const sensibles = detectarDatos(`${d.proposito} ${d.prompt} ${d.sintesis} ${d.auditoria}`);
  if (sensibles.length) { err.textContent = `El registro parece contener datos personales (${sensibles.join(', ')}). La Matriz F2-A no debe incluirlos.`; err.hidden = false; return; }
  if ((d.decision === 'APR' || d.decision === 'APM') && !f.fuentes.checked) {
    err.textContent = 'Para aprobar (APR o APM) primero verifica fuentes y exactitud y marca la casilla. Si no pudiste verificar, elige ITE o DES.'; err.hidden = false; return;
  }
  const reg = {
    id: nuevoId('b'), identificador: f.identificador.value, ts: Date.now(), fase: estado.fase, componente: d.componente,
    agente: d.agente, proposito: d.proposito.trim(), prompt: (d.prompt || '').trim(), rocas: f.rocas.checked, intento: Number(d.intento) || 1,
    sintesis: (d.sintesis || '').trim(), auditoria: d.auditoria.trim(), hallazgo: d.hallazgo, principio: d.principio, decision: d.decision,
    minutos: Number(d.minutos) || 0, fuentes: f.fuentes.checked, mensajeId: f.dataset.mensaje || null
  };
  estado.bitacora.push(reg);
  persistir({ registro: reg });
  $('#dlg-hitl').close();
  pintarProgreso();
  agregarMensaje({ rol: 'sistema', texto: `Decisión registrada en la bitácora: ${reg.identificador} · ${reg.hallazgo} · ${reg.decision} (${DECISIONES.find((x) => x.codigo === reg.decision).nombre.toLowerCase()}).` });
  aviso('Registro guardado en la bitácora HITL.');
}

// ---------- Revisar avance ----------
function abrirAvance() {
  if (!estado) return;
  pintarRubrica();
  pintarResumen();
  pintarReflexion();
  seleccionarTab('tb-rubrica');
  $('#dlg-avance').showModal();
}

function pintarRubrica() {
  const vals = estado.versiones[estado.fase].rubrica || {};
  $('#tabla-rubrica').innerHTML = `<p><strong>${escapar(faseActual().nombre)}</strong></p>` + RUBRICA.map((c) => {
    const v = vals[c.n];
    const escala = [4, 3, 2, 1, 'NA'].map((x) => `<label><input type="radio" name="c${c.n}" value="${x}" ${String(v) === String(x) ? 'checked' : ''}> ${x}</label>`).join('');
    return `<fieldset class="fila-rubrica"><legend class="sr-only">Criterio ${c.n}: ${escapar(c.criterio)}</legend>
      <div class="titulo"><span>${c.n}. ${escapar(c.criterio)}</span></div>
      <div class="descriptor" id="desc-${c.n}">${v && v !== 'NA' ? escapar(c.niveles[v]) : 'Selecciona un nivel para ver su descriptor.'}</div>
      <div class="escala" data-criterio="${c.n}">${escala}</div></fieldset>`;
  }).join('');
  actualizarResultadoRubrica();
}

function leerRubricaFormulario() {
  const vals = {};
  for (const c of RUBRICA) {
    const sel = document.querySelector(`input[name="c${c.n}"]:checked`);
    if (sel) vals[c.n] = sel.value === 'NA' ? 'NA' : Number(sel.value);
  }
  return vals;
}

function actualizarResultadoRubrica() {
  const vals = leerRubricaFormulario();
  for (const c of RUBRICA) {
    const v = vals[c.n];
    $(`#desc-${c.n}`).textContent = v === undefined ? 'Selecciona un nivel para ver su descriptor.' : v === 'NA' ? 'No aplica en este punto de control.' : c.niveles[v];
  }
  const ev = evaluarRubrica(vals);
  const caja = $('#resultado-rubrica');
  caja.className = 'resultado-rubrica';
  const textos = {
    SIN_DATOS: 'Aún no has valorado ningún criterio.',
    FALTA_C6: 'Falta valorar el criterio 6 (precisión disciplinar): la regla F2-B exige un 4 en ese criterio para aprobar.',
    APROBADO: 'Según la regla F2-B, esta versión <strong>puede aprobarse</strong>: ningún criterio está en 1 o 2 y la precisión disciplinar tiene 4. La decisión final es tuya y de tu docente.',
    ITERAR: `Según la regla F2-B, esta versión <strong>debe iterar</strong>${ev.bajos?.length ? ` (criterios en 1 o 2: ${ev.bajos.join(', ')})` : ''}${ev.c6 !== 4 && typeof ev.c6 === 'number' ? '; el criterio 6 debe llegar a 4' : ''}. Registra el motivo en la bitácora F2-A.`
  };
  if (ev.decision === 'APROBADO') caja.classList.add('aprobado');
  if (ev.decision === 'ITERAR') caja.classList.add('iterar');
  caja.innerHTML = `${textos[ev.decision]}${ev.indiceCTML ? `<br>Índice CTML (criterios 1 a 5): <strong>${ev.indiceCTML.toFixed(2)}</strong> de 4.` : ''}`;
  return { vals, ev };
}

function guardarRubrica(silencioso = false) {
  const { vals } = actualizarResultadoRubrica();
  estado.versiones[estado.fase].rubrica = vals;
  persistir({ version: estado.fase });
  pintarProgreso();
  if (!silencioso) aviso('Autoevaluación F2-B guardada.');
}

async function pedirRevision() {
  guardarRubrica(true);
  $('#dlg-avance').close();
  const t = 'Revisa mi avance con la autoevaluación F2-B que acabo de guardar.';
  agregarMensaje({ rol: 'estudiante', texto: t });
  await pedirAgente('revisar_avance', t);
}

function pintarResumen() {
  const { filas, total } = resumenPorVersion(estado);
  const fila = (nombre, k) => `<tr><td>${nombre}</td>${filas.map((f) => `<td>${f[k]}</td>`).join('')}<td><strong>${total[k]}</strong></td></tr>`;
  $('#tabla-resumen').innerHTML = `<table class="tabla-resumen"><thead><tr><th>Indicador</th>${filas.map((f) => `<th>${escapar(f.fase.corto)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
    ${fila('N.º de interacciones registradas', 'n')}${fila('% aprobadas sin cambios (APR)', 'apr')}${fila('% aprobadas con modificaciones (APM)', 'apm')}
    ${fila('% iteradas (ITE)', 'ite')}${fila('% descartadas (DES)', 'des')}${fila('Alucinaciones detectadas (ALU)', 'alu')}
    ${fila('Sesgos detectados (SES)', 'ses')}${fila('Detalles seductores o redundancias (SED, RED)', 'sedred')}${fila('Minutos de revisión humana', 'minutos')}
  </tbody></table>`;
}

function pintarReflexion() {
  const previa = estado.versiones[estado.fase].reflexion || [];
  $('#form-reflexion').innerHTML = PREGUNTAS_REFLEXION.map((p, i) =>
    `<label>${escapar(p)}<textarea name="r${i}" rows="2" maxlength="800">${escapar(previa[i] || '')}</textarea></label>`).join('');
  const ultima = estado.fase === 'DES-O';
  $('#btn-cerrar-version').textContent = ultima ? 'Cerrar versión Oro y completar el ciclo' : 'Cerrar versión y avanzar';
  $('#btn-cerrar-version').disabled = Boolean(estado.versiones[estado.fase].cierre && ultima);
}

async function cerrarVersion() {
  const resp = PREGUNTAS_REFLEXION.map((_, i) => ($(`#form-reflexion [name="r${i}"]`).value || '').trim());
  const err = $('#error-cierre');
  if (resp.some((r) => r.length < 15)) { err.textContent = 'Responde las cuatro preguntas con al menos una frase completa: la reflexión es obligatoria para cerrar la versión.'; err.hidden = false; return; }
  if (detectarDatos(resp.join(' ')).length) { err.textContent = 'Tu reflexión parece incluir datos personales. Quítalos antes de cerrar.'; err.hidden = false; return; }
  err.hidden = true;
  guardarRubrica(true);
  const actual = estado.fase;
  const ev = evaluarRubrica(estado.versiones[actual].rubrica);
  estado.versiones[actual].reflexion = resp;
  estado.versiones[actual].cierre = Date.now();
  estado.versiones[actual].decisionAlCierre = ev.decision;
  persistir({ version: actual });
  $('#dlg-avance').close();
  const reflexionTexto = PREGUNTAS_REFLEXION.map((p, i) => `${p} ${resp[i]}`).join(' | ');
  const t = `Cierro ${faseActual().frase}. Mi reflexión: ${resp[0]}`;
  agregarMensaje({ rol: 'estudiante', texto: t });
  await pedirAgente('cierre_iteracion', t, { reflexion: reflexionTexto, resumenBitacora: resumenBitacoraTexto() });
  const idx = FASES.findIndex((f) => f.codigo === actual);
  if (idx < FASES.length - 1) {
    estado.fase = FASES[idx + 1].codigo;
    estado.versiones[estado.fase].inicio = estado.versiones[estado.fase].inicio || Date.now();
    estado.pista.nivel = 0;
    agregarMensaje({ rol: 'sistema', texto: `Avanzas a ${faseActual().frase}. La bitácora de la versión anterior queda cerrada.` });
  } else {
    agregarMensaje({ rol: 'sistema', texto: 'Ciclo SAM2 completo (Savvy Start, Alfa, Beta y Oro). Exporta tu informe PDF y entrégalo a tu docente para la validación por pares de la versión Oro.' });
  }
  persistir({ version: estado.fase });
  pintarProgreso();
  actualizarPistas();
}

function seleccionarTab(id) {
  $$('#dlg-avance [role="tab"]').forEach((b) => {
    const sel = b.id === id;
    b.setAttribute('aria-selected', String(sel));
    b.tabIndex = sel ? 0 : -1;
    $('#' + b.getAttribute('aria-controls')).hidden = !sel;
  });
}

// ---------- Docente, acerca y exportación ----------
function abrirMensajeDocente() {
  const ultimaPregunta = [...estado.mensajes].reverse().find((m) => m.rol === 'estudiante');
  $('#txt-docente').value = `Profesor(a), cordial saludo.\n\nEstoy trabajando en mi OVA «${estado.ova.tema}» (${faseActual().nombre}, componente ${estado.componente}).\n` +
    `El agente OVA-Mentor HITL me indicó que esta consulta corresponde a usted:\n\n«${ultimaPregunta?.texto || ''}»\n\n` +
    `Código de sesión: ${estado.sesionId.slice(-8).toUpperCase()}.\nQuedo atento(a) a su orientación.\n`;
  $('#dlg-docente').showModal();
}

function pintarAcerca() {
  $('#contenido-acerca').innerHTML = `
    <h2 id="t-acerca">Acerca de OVA-Mentor HITL</h2>
    <p>${escapar(AGENTE.descripcion)}</p>
    <h3>Qué hace</h3>
    <ul><li>Formula preguntas socráticas antes de opinar.</li><li>Da hasta tres pistas graduales por tema, nunca la solución.</li>
    <li>Retroalimenta con la rúbrica F2-B y los principios de Mayer: fortaleza, aspecto por mejorar y siguiente paso.</li>
    <li>Exige tu validación humana antes de aprobar contenido generado con IA y la registra en la bitácora (Matriz F2-A).</li>
    <li>Escala al docente las calificaciones, las dudas disciplinares y los casos sensibles.</li></ul>
    <h3>Qué no hace</h3>
    <ul><li>No produce el OVA ni sus componentes resueltos.</li><li>No califica: la valoración sumativa es del docente.</li>
    <li>No sustituye al director del proyecto ni al experto en contenido.</li><li>No navega en internet ni conoce el contenido disciplinar de tu OVA.</li></ul>
    <h3>Privacidad y datos (Ley 1581 de 2012)</h3>
    <ul><li>Datos que se guardan: seudónimo, tema y objetivo del OVA, conversación, autoevaluaciones, reflexiones y bitácora HITL.</li>
    <li>No se guardan las capturas de pantalla: se envían una sola vez al modelo para la revisión y se descartan.</li>
    <li>Dónde: en este navegador y, si está activa, en una base de datos Firebase Firestore con acceso restringido a tu sesión anónima.</li>
    <li>Para qué: acompañamiento formativo y análisis de la investigación «Metodología de producción ágil de OVA con IA generativa y HITL».</li>
    <li>Tus derechos: puedes exportar o borrar tus datos desde «Exportar».</li>
    <li>Los mensajes se procesan con la API de Gemini (Google). Antes de enviarlos, el sistema oculta correos, teléfonos y números de documento.</li></ul>
    <h3>Información técnica</h3>
    <p class="nota">Versión ${AGENTE.version} · Modo: ${modo === 'ia' ? 'IA conectada (' + escapar(modeloServidor) + ')' : 'demostración'} · Persistencia: ${nube.activa ? 'Firestore + navegador' : 'navegador'}.</p>
    <h3>Créditos</h3>
    <p class="nota">${escapar(AGENTE.autores)}. ${escapar(AGENTE.programa)}. ${escapar(AGENTE.curso)}. Docente: ${escapar(AGENTE.docente)}. Prototipo desarrollado con Vibe Coding asistido por IA y revisado por los autores.</p>
    <div class="fila-botones fin"><button type="button" class="btn btn-pri" data-cerrar>Entendido</button></div>`;
  $('#dlg-acerca').showModal();
}

async function borrarDatos() {
  if (!confirm('¿Seguro que quieres borrar tu sesión de este navegador y de la nube? No se puede deshacer.')) return;
  try { await nube.borrarTodo(); } catch { aviso('No se pudo borrar de la nube; se borra la copia local.'); }
  borrarLocal();
  location.reload();
}

function cambiarPestana(p) {
  document.body.dataset.pestana = p;
  $$('.pestanas-movil button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pestana === p)));
}

// ---------- Eventos ----------
function enlazarEventos() {
  document.body.dataset.pestana = 'chat';
  $('#form-inicio').addEventListener('submit', iniciarSesion);
  $('#btn-continuar').addEventListener('click', continuarSesion);
  $('#entrada').addEventListener('submit', enviar);
  $('#texto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar(e); });
  $('#btn-pista').addEventListener('click', solicitarPista);
  $('#archivo').addEventListener('change', adjuntar);
  $('#btn-quitar-adjunto').addEventListener('click', quitarAdjunto);
  $('#btn-registrar').addEventListener('click', () => abrirRegistro());
  $('#form-hitl').addEventListener('submit', guardarRegistro);
  $('#btn-avance').addEventListener('click', abrirAvance);
  $('#tabla-rubrica').addEventListener('change', actualizarResultadoRubrica);
  $('#btn-guardar-rubrica').addEventListener('click', () => guardarRubrica());
  $('#btn-pedir-revision').addEventListener('click', pedirRevision);
  $('#btn-cerrar-version').addEventListener('click', cerrarVersion);
  $$('#dlg-avance [role="tab"]').forEach((b, i, arr) => {
    b.addEventListener('click', () => seleccionarTab(b.id));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const sig = arr[(i + (e.key === 'ArrowRight' ? 1 : arr.length - 1)) % arr.length];
      seleccionarTab(sig.id); sig.focus();
    });
  });
  $('#btn-recursos').addEventListener('click', consultarRecursos);
  $('#recursos').addEventListener('click', (e) => { const b = e.target.closest('[data-preguntar]'); if (b) preguntarPrincipio(b.dataset.preguntar); });
  $('#mensajes').addEventListener('click', (e) => { const b = e.target.closest('[data-registrar]'); if (b) abrirRegistro(b.dataset.registrar); });
  $('#btn-exportar').addEventListener('click', () => $('#dlg-exportar').showModal());
  $('#exp-csv-bitacora').addEventListener('click', () => { exportarCSVBitacora(estado); aviso('Bitácora exportada en CSV.'); });
  $('#exp-csv-chat').addEventListener('click', () => { exportarCSVChat(estado); aviso('Conversación exportada en CSV.'); });
  $('#exp-json').addEventListener('click', () => exportarJSON(estado));
  $('#exp-pdf').addEventListener('click', () => { try { exportarPDF(estado); aviso('Informe PDF generado.'); } catch (e) { aviso(e.message, 5000); } });
  $('#btn-borrar').addEventListener('click', borrarDatos);
  $('#btn-acerca').addEventListener('click', pintarAcerca);
  $('#btn-msj-docente').addEventListener('click', abrirMensajeDocente);
  $('#btn-copiar-docente').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#txt-docente').value); aviso('Texto copiado.'); }
    catch { $('#txt-docente').select(); aviso('Selecciona y copia el texto con Ctrl + C.'); }
  });
  $('#priv-editar').addEventListener('click', () => { $('#dlg-privacidad').close(); $('#texto').focus(); envioPendiente = null; });
  $('#priv-enmascarar').addEventListener('click', async () => {
    $('#dlg-privacidad').close();
    const t = enmascarar(envioPendiente || '');
    envioPendiente = null;
    await enviarConfirmado(t);
  });
  $$('.pestanas-movil button').forEach((b) => b.addEventListener('click', () => cambiarPestana(b.dataset.pestana)));
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-cerrar]'); if (c) c.closest('dialog')?.close(); });
}

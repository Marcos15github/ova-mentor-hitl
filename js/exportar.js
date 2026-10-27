// Exportación de la trazabilidad: CSV con los encabezados oficiales de la Matriz F2-A,
// CSV de la conversación, informe PDF y copia JSON.
import { COLUMNAS_F2A, FASES, RUBRICA, PRINCIPIOS, HALLAZGOS, DECISIONES, AGENTE, PREGUNTAS_REFLEXION, TIPOS_INTERVENCION, evaluarRubrica } from '../lib/kb.js';
import { descargar, fechaCorta, fechaHora } from './util.js';

const celda = (v) => {
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Punto y coma + BOM UTF-8: Excel en español abre el archivo con tildes y columnas correctas.
const csv = (filas) => '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
const nombreBase = (e) => `OVA-Mentor_${(e.alias || 'sesion').replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
const nomPrincipio = (id) => PRINCIPIOS.find((p) => p.id === id)?.nombre || (id === 'ninguno' || !id ? 'No aplica' : id);
const nomFase = (c) => FASES.find((f) => f.codigo === c)?.corto || c;
// Quita las marcas de formato (negritas y cursivas) para archivos de texto plano.
const plano = (s = '') => String(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S[^*]*?)\*/g, '$1');

export function filasBitacora(e) {
  return e.bitacora.map((b) => [
    b.identificador, fechaCorta(b.ts), b.fase, b.componente, b.agente, b.proposito, b.prompt, b.rocas ? 'Sí' : 'No',
    b.intento, b.sintesis, b.auditoria, b.hallazgo, nomPrincipio(b.principio), b.decision, b.minutos, b.fuentes ? 'Sí' : 'No'
  ]);
}

export function resumenPorVersion(e) {
  const filas = FASES.map((f) => {
    const regs = e.bitacora.filter((b) => b.fase === f.codigo);
    const n = regs.length;
    const pct = (cod) => (n ? Math.round((regs.filter((b) => b.decision === cod).length / n) * 100) + ' %' : '—');
    const cuenta = (...cods) => regs.filter((b) => cods.includes(b.hallazgo)).length;
    return {
      fase: f, n, apr: pct('APR'), apm: pct('APM'), ite: pct('ITE'), des: pct('DES'),
      alu: cuenta('ALU'), ses: cuenta('SES'), sedred: cuenta('SED', 'RED'),
      minutos: regs.reduce((a, b) => a + (Number(b.minutos) || 0), 0)
    };
  });
  const n = e.bitacora.length;
  const pctT = (cod) => (n ? Math.round((e.bitacora.filter((b) => b.decision === cod).length / n) * 100) + ' %' : '—');
  const total = {
    n, apr: pctT('APR'), apm: pctT('APM'), ite: pctT('ITE'), des: pctT('DES'),
    alu: e.bitacora.filter((b) => b.hallazgo === 'ALU').length,
    ses: e.bitacora.filter((b) => b.hallazgo === 'SES').length,
    sedred: e.bitacora.filter((b) => ['SED', 'RED'].includes(b.hallazgo)).length,
    minutos: e.bitacora.reduce((a, b) => a + (Number(b.minutos) || 0), 0)
  };
  return { filas, total };
}

export function exportarCSVBitacora(e) {
  descargar(csv([COLUMNAS_F2A, ...filasBitacora(e)]), nombreBase(e) + '_bitacora_F2A.csv', 'text/csv;charset=utf-8');
}

export function exportarCSVChat(e) {
  const filas = [['Fecha y hora', 'Versión SAM2', 'Autor', 'Mensaje', 'Tipo de intervención', 'Principio de Mayer', 'Criterio F2-B', 'Fuente', 'Requiere validación humana', 'Escalado al docente', 'Origen']];
  for (const m of e.mensajes.filter((x) => x.rol !== 'sistema')) {
    const meta = m.meta || {};
    filas.push([fechaHora(m.ts), nomFase(m.fase), m.rol === 'agente' ? 'OVA-Mentor (IA)' : `Estudiante (${e.alias})`, plano(m.texto),
      TIPOS_INTERVENCION[meta.tipo_intervencion] || '', meta.principio_mayer ? nomPrincipio(meta.principio_mayer) : '',
      meta.criterio_rubrica || '', meta.fuente || '', meta.requiere_validacion_humana ? 'Sí' : '', meta.escalar_docente ? 'Sí' : '',
      m.rol === 'agente' ? (m.demo ? 'Simulado (modo demostración)' : (m.modelo || 'IA')) : '']);
  }
  descargar(csv(filas), nombreBase(e) + '_conversacion.csv', 'text/csv;charset=utf-8');
}

export function exportarJSON(e) {
  descargar(JSON.stringify(e, null, 2), nombreBase(e) + '_respaldo.json', 'application/json');
}

export function exportarPDF(e) {
  const lib = window.jspdf;
  if (!lib?.jsPDF) throw new Error('El generador de PDF no se cargó. Revisa tu conexión y recarga la página.');
  const doc = new lib.jsPDF({ unit: 'pt', format: 'letter' });
  const verde = [0, 86, 59];
  const W = doc.internal.pageSize.getWidth();
  let y = 48;
  const titulo = (t) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...verde); doc.text(t, 40, y); y += 16; doc.setTextColor(20); };
  const parrafo = (t, tam = 9.5) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
    const lineas = doc.splitTextToSize(String(t), W - 80);
    if (y + lineas.length * 12 > 740) { doc.addPage(); y = 48; }
    doc.text(lineas, 40, y); y += lineas.length * 12 + 6;
  };
  const autoTable = window.autoTable || ((d, o) => d.autoTable(o));
  const tabla = (head, body, opts = {}) => {
    autoTable(doc, { head: [head], body, startY: y, margin: { left: 40, right: 40 }, styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: verde, textColor: 255 }, alternateRowStyles: { fillColor: [244, 246, 244] }, ...opts });
    y = doc.lastAutoTable.finalY + 18;
  };

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...verde);
  doc.text('Informe de trazabilidad HITL — OVA-Mentor HITL', 40, y); y += 20;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
  const cab = doc.splitTextToSize(`${AGENTE.programa} · ${AGENTE.curso}`, W - 80);
  doc.text(cab, 40, y); y += cab.length * 12 + 1;
  doc.text(`Generado el ${fechaHora(Date.now())} · Código de sesión ${e.sesionId.slice(-8).toUpperCase()}`, 40, y); y += 22;
  doc.setTextColor(20);

  titulo('1. Datos de la sesión');
  tabla(['Campo', 'Valor'], [
    ['Seudónimo', e.alias], ['Tema del OVA', e.ova.tema], ['Objetivo de aprendizaje', e.ova.objetivo],
    ['Versión SAM2 actual', FASES.find((f) => f.codigo === e.fase)?.nombre || e.fase], ['Inicio de la sesión', fechaHora(e.creado)],
    ['Mensajes intercambiados', String(e.mensajes.filter((m) => m.rol !== 'sistema').length)], ['Registros en la bitácora', String(e.bitacora.length)]
  ], { columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold' } } });

  titulo('2. Resumen por versión (estructura de la Matriz F2-A)');
  const { filas, total } = resumenPorVersion(e);
  tabla(['Indicador', ...filas.map((f) => f.fase.corto), 'Total'], [
    ['N.º de interacciones registradas', ...filas.map((f) => f.n), total.n],
    ['% aprobadas sin cambios (APR)', ...filas.map((f) => f.apr), total.apr],
    ['% aprobadas con modificaciones (APM)', ...filas.map((f) => f.apm), total.apm],
    ['% iteradas (ITE)', ...filas.map((f) => f.ite), total.ite],
    ['% descartadas (DES)', ...filas.map((f) => f.des), total.des],
    ['Alucinaciones detectadas (ALU)', ...filas.map((f) => f.alu), total.alu],
    ['Sesgos detectados (SES)', ...filas.map((f) => f.ses), total.ses],
    ['Detalles seductores o redundancias (SED, RED)', ...filas.map((f) => f.sedred), total.sedred],
    ['Minutos de revisión humana', ...filas.map((f) => f.minutos), total.minutos]
  ]);

  titulo('3. Autoevaluación con la rúbrica F2-B por versión');
  const filasR = RUBRICA.map((c) => [`${c.n}. ${c.criterio}`, ...FASES.map((f) => e.versiones[f.codigo]?.rubrica?.[c.n] ?? '—')]);
  const ev = FASES.map((f) => evaluarRubrica(e.versiones[f.codigo]?.rubrica));
  filasR.push(['Índice CTML (promedio 1–5)', ...ev.map((r) => (r.indiceCTML ? r.indiceCTML.toFixed(2) : '—'))]);
  filasR.push(['Decisión según la regla F2-B', ...ev.map((r) => ({ APROBADO: 'Aprobado', ITERAR: 'Iterar', FALTA_C6: 'Falta C6', SIN_DATOS: '—' }[r.decision]))]);
  tabla(['Criterio', ...FASES.map((f) => f.corto)], filasR);

  if (e.bitacora.length) {
    if (y > 560) { doc.addPage(); y = 48; }
    titulo('4. Bitácora HITL (Matriz de Trazabilidad F2-A)');
    tabla(['Identificador', 'Fecha', 'Fase', 'Comp.', 'Propósito', 'Auditoría HITL', 'Hallazgo', 'Principio', 'Decisión', 'Min.', 'Fuentes'],
      e.bitacora.map((b) => [b.identificador, fechaCorta(b.ts), b.fase, b.componente, b.proposito, b.auditoria, b.hallazgo, nomPrincipio(b.principio), b.decision, b.minutos, b.fuentes ? 'Sí' : 'No']),
      { styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 46 }, 2: { cellWidth: 30 }, 3: { cellWidth: 26 }, 4: { cellWidth: 72 },
          5: { cellWidth: 122 }, 6: { cellWidth: 36 }, 7: { cellWidth: 50 }, 8: { cellWidth: 34 }, 9: { cellWidth: 22 }, 10: { cellWidth: 28 } } });
  }

  const reflexiones = FASES.filter((f) => e.versiones[f.codigo]?.reflexion);
  if (reflexiones.length) {
    titulo('5. Reflexiones metacognitivas');
    for (const f of reflexiones) {
      parrafo(`${f.nombre} (cerrada el ${fechaCorta(e.versiones[f.codigo].cierre)})`, 10);
      PREGUNTAS_REFLEXION.forEach((p, i) => parrafo(`${p} ${e.versiones[f.codigo].reflexion[i] || '—'}`));
    }
  }

  titulo(`${reflexiones.length ? 6 : 5}. Conversación`);
  tabla(['Hora', 'Autor', 'Mensaje', 'Intervención'], e.mensajes.filter((m) => m.rol !== 'sistema').map((m) => [
    fechaHora(m.ts), m.rol === 'agente' ? (m.demo ? 'Agente (simulado)' : 'Agente (IA)') : 'Estudiante', plano(m.texto),
    TIPOS_INTERVENCION[m.meta?.tipo_intervencion] || ''
  ]), { columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 70 }, 2: { cellWidth: 300 } } });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(110);
    doc.text(`OVA-Mentor HITL · ${AGENTE.advertencia} · Página ${i} de ${paginas}`, 40, 770);
  }
  doc.save(nombreBase(e) + '_informe.pdf');
}

export const _interno = { HALLAZGOS, DECISIONES };

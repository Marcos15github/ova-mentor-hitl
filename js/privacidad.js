// Detector de datos personales antes de enviar un mensaje (minimización de datos,
// Ley Estatutaria 1581 de 2012). Es una ayuda, no una garantía: el estudiante decide.
import { NOMBRE_PRESENTADO } from '../lib/prompt.js';
const PATRONES = [
  { tipo: 'correo electrónico', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, reemplazo: '[correo]' },
  { tipo: 'número de teléfono', re: /(\+?57[\s-]?)?\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, reemplazo: '[teléfono]' },
  { tipo: 'número de documento', re: /\b\d{1,3}(\.\d{3}){2,3}\b|\b\d{8,10}\b/g, reemplazo: '[documento]' },
  { tipo: 'nombre de una persona', re: NOMBRE_PRESENTADO, reemplazo: (m, p1) => `${p1} [nombre]` },
  { tipo: 'dirección', re: /\b(calle|carrera|cra\.?|cl\.?|diagonal|transversal|avenida)\s*\d+[a-z]?\s*(#|n[.ºo°]?)\s*\d+[a-z]?\s*-\s*\d+/gi, reemplazo: '[dirección]' }
];

export function detectarDatos(texto = '') {
  const hallados = [];
  for (const p of PATRONES) {
    p.re.lastIndex = 0;
    if (p.re.test(texto)) hallados.push(p.tipo);
    p.re.lastIndex = 0;
  }
  return hallados;
}

export function enmascarar(texto = '') {
  let s = String(texto);
  for (const p of PATRONES) { p.re.lastIndex = 0; s = s.replace(p.re, p.reemplazo); }
  return s;
}

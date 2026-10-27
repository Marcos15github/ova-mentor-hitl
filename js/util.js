// Utilidades de interfaz.
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function escapar(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Markdown mínimo y seguro: se escapa todo y luego se aplican negritas, cursivas y listas.
export function markdown(texto = '') {
  const lineas = escapar(texto).split(/\r?\n/);
  let html = '';
  let lista = null;
  const inline = (l) => l
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/«(.+?)»/g, '«$1»');
  const cerrar = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  for (const l of lineas) {
    const ul = l.match(/^\s*[-•]\s+(.*)/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul) { if (lista !== 'ul') { cerrar(); html += '<ul>'; lista = 'ul'; } html += `<li>${inline(ul[1])}</li>`; }
    else if (ol) { if (lista !== 'ol') { cerrar(); html += '<ol>'; lista = 'ol'; } html += `<li>${inline(ol[1])}</li>`; }
    else if (!l.trim()) { cerrar(); }
    else { cerrar(); html += `<p>${inline(l)}</p>`; }
  }
  cerrar();
  return html;
}

export function nuevoId(prefijo = '') {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return prefijo + Date.now().toString(36) + r[0].toString(36) + r[1].toString(36).slice(0, 4);
}

export function fechaCorta(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function horaCorta(ts) {
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
export function fechaHora(ts) {
  return new Date(ts).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

let temporizadorToast;
export function aviso(texto, ms = 3200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = texto;
  t.hidden = false;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => { t.hidden = true; }, ms);
}

export function descargar(contenido, nombre, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function contarPalabras(s = '') {
  return String(s).trim().split(/\s+/).filter(Boolean).length;
}

// Reduce una imagen a un máximo de 1280 px y la convierte a JPEG (minimiza datos y peso).
export function prepararImagen(archivo, maxLado = 1280, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) return reject(new Error('Formato no admitido. Usa PNG, JPG o WEBP.'));
    if (archivo.size > 12 * 1024 * 1024) return reject(new Error('La imagen supera 12 MB.'));
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La imagen está dañada.'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', calidad);
        resolve({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1], vista: dataUrl, ancho: c.width, alto: c.height,
          kb: Math.round((dataUrl.length * 3) / 4 / 1024) });
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

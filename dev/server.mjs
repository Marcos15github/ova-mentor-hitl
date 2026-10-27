// Servidor local de desarrollo: sirve los archivos estáticos y ejecuta las funciones
// de /api como lo haría Vercel. Con MOCK_IA=1 simula respuestas del modelo para pruebas.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = Number(process.env.PORT || 5173);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

function envolverRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}

async function leerCuerpo(req) {
  let datos = '';
  for await (const ch of req) datos += ch;
  try { return JSON.parse(datos || '{}'); } catch { return {}; }
}

// Simulación de Gemini para pruebas sin clave: devuelve JSON con el esquema real.
if (process.env.MOCK_IA === '1') {
  process.env.GEMINI_API_KEY = 'clave-de-prueba-local';
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (!String(url).includes('generativelanguage.googleapis.com')) return fetchReal(url, opts);
    const cuerpo = JSON.parse(opts.body);
    const ultimo = cuerpo.contents.at(-1).parts[0].text;
    const tieneImagen = cuerpo.contents.at(-1).parts.some((p) => p.inlineData);
    let r;
    if (/SOLICITAR PISTA/.test(ultimo)) {
      const n = (ultimo.match(/pista de nivel (\d)/) || [])[1];
      r = { respuesta: `Pista ${n} de 3 (simulada por el servidor de pruebas): piensa en el principio de redundancia. ¿Qué pasa si la voz y el texto dicen lo mismo al mismo tiempo?`, tipo_intervencion: 'pista', principio_mayer: 'redundancia', criterio_rubrica: 5, fuente: 'principios_mayer', requiere_validacion_humana: false, escalar_docente: false, hallazgo_sugerido: 'NA', siguiente_paso: 'Propón un ajuste.' };
    } else if (tieneImagen) {
      r = { respuesta: 'Observo una pantalla con un título, un párrafo largo y un diagrama a la derecha. **Fortaleza:** el diagrama es pertinente. **Por mejorar:** el párrafo explica el diagrama lejos de él (contigüidad espacial). **Siguiente paso:** acerca cada explicación a su parte del diagrama. ¿Qué etiqueta moverías primero? Soy una IA: verifica mis sugerencias y decide tú.', tipo_intervencion: 'retroalimentacion', principio_mayer: 'contiguidad_espacial', criterio_rubrica: 2, fuente: 'rubrica_F2B', requiere_validacion_humana: true, escalar_docente: false, hallazgo_sugerido: 'FOR', siguiente_paso: 'Reubicar las etiquetas junto al diagrama.' };
    } else {
      r = { respuesta: '**Fortaleza:** tu objetivo es claro. **Por mejorar:** el texto en pantalla repite la narración (principio de redundancia). **Siguiente paso:** deja la narración con un esquema. ¿Qué parte podría quedar solo en la voz? Soy una IA: verifica mis sugerencias y decide tú.', tipo_intervencion: 'retroalimentacion', principio_mayer: 'redundancia', criterio_rubrica: 5, fuente: 'rubrica_F2B', requiere_validacion_humana: true, escalar_docente: false, hallazgo_sugerido: 'RED', siguiente_paso: 'Quitar el texto duplicado y registrar la decisión.' };
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

http.createServer(async (req, res) => {
  envolverRes(res);
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      const nombre = url.pathname.replace('/api/', '').replace(/[^a-z-]/g, '');
      const mod = await import(join(RAIZ, 'api', nombre + '.js'));
      req.body = req.method === 'POST' ? await leerCuerpo(req) : undefined;
      return await mod.default(req, res);
    }
    let ruta = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ)) return res.status(403).end('Prohibido');
    await stat(archivo);
    res.setHeader('Content-Type', TIPOS[extname(archivo)] || 'application/octet-stream');
    res.end(await readFile(archivo));
  } catch (e) {
    if (e.code === 'ENOENT') { res.statusCode = 404; res.end('No encontrado'); }
    else { console.error(e); res.statusCode = 500; res.end('Error: ' + e.message); }
  }
}).listen(PUERTO, () => console.log(`OVA-Mentor HITL en http://localhost:${PUERTO} ${process.env.MOCK_IA === '1' ? '(IA simulada)' : ''}`));

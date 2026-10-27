// Lee FIREBASE_CONFIG aceptando JSON o el objeto que copia la consola de Firebase:
//   const firebaseConfig = { apiKey: "...", authDomain: "...", ... };
export function leerFirebaseConfig(valor) {
  if (!valor) return null;
  let s = String(valor).trim();
  s = s.replace(/^[^{]*?=\s*/, '').replace(/;\s*$/, '');
  const inicio = s.indexOf('{');
  const fin = s.lastIndexOf('}');
  if (inicio === -1 || fin === -1) return null;
  s = s.slice(inicio, fin + 1)
    .replace(/\/\/.*$/gm, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, '}');
  try {
    const c = JSON.parse(s);
    if (!c.projectId || !c.apiKey) return null;
    return { apiKey: c.apiKey, authDomain: c.authDomain, projectId: c.projectId,
      storageBucket: c.storageBucket, messagingSenderId: c.messagingSenderId, appId: c.appId };
  } catch {
    return null;
  }
}

// Persistencia en dos capas:
// 1) Navegador (localStorage): siempre disponible, funciona sin conexión.
// 2) Nube (Firebase Firestore con autenticación anónima): solo si el servidor
//    entrega una configuración de Firebase. Cada estudiante solo puede leer y
//    escribir su propia sesión (ver firestore.rules).
const CLAVE_LOCAL = 'ova-mentor-hitl:sesion:v1';

const limpiar = (o) => JSON.parse(JSON.stringify(o ?? null)); // Firestore no acepta undefined

export function leerLocal() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL) || 'null'); } catch { return null; }
}
export function guardarLocal(estado) {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(estado)); return true; } catch { return false; }
}
export function borrarLocal() {
  try { localStorage.removeItem(CLAVE_LOCAL); } catch { /* sin almacenamiento */ }
}

export class Nube {
  constructor() { this.activa = false; this.uid = null; this.error = null; this.fs = null; this.db = null; this.pendiente = Promise.resolve(); }

  async iniciar() {
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (!r.ok) throw new Error('sin configuración');
      const { firebase } = await r.json();
      if (!firebase) return false;
      const [{ initializeApp }, auth, fs] = await Promise.all([
        import('../vendor/firebase/firebase-app.js'),
        import('../vendor/firebase/firebase-auth.js'),
        import('../vendor/firebase/firebase-firestore.js')
      ]);
      const app = initializeApp(firebase);
      const a = auth.getAuth(app);
      const cred = await auth.signInAnonymously(a);
      this.uid = cred.user.uid;
      this.fs = fs;
      this.db = fs.getFirestore(app);
      this.activa = true;
      return true;
    } catch (e) {
      this.error = e.message || String(e);
      this.activa = false;
      return false;
    }
  }

  // Encola las escrituras para conservar el orden y no bloquear la interfaz.
  _encolar(fn) {
    const op = this.pendiente.catch(() => {}).then(fn);
    this.pendiente = op.then(() => { this.error = null; }, (e) => { this.error = e.message || String(e); });
    return op;
  }

  guardarSesion(meta) {
    if (!this.activa) return Promise.resolve(false);
    const { doc, setDoc, serverTimestamp } = this.fs;
    return this._encolar(() => setDoc(doc(this.db, 'sesiones', this.uid),
      { ...limpiar(meta), uid: this.uid, actualizado: serverTimestamp() }, { merge: true }));
  }

  guardarItem(coleccion, id, datos) {
    if (!this.activa) return Promise.resolve(false);
    const { doc, setDoc, serverTimestamp } = this.fs;
    return this._encolar(() => setDoc(doc(this.db, 'sesiones', this.uid, coleccion, id),
      { ...limpiar(datos), guardado: serverTimestamp() }, { merge: true }));
  }

  async cargar() {
    if (!this.activa) return null;
    const { doc, getDoc, getDocs, collection } = this.fs;
    const meta = await getDoc(doc(this.db, 'sesiones', this.uid));
    if (!meta.exists()) return null;
    const leer = async (c) => (await getDocs(collection(this.db, 'sesiones', this.uid, c))).docs.map((d) => d.data());
    const [mensajes, bitacora, versiones] = await Promise.all([leer('mensajes'), leer('bitacora'), leer('versiones')]);
    return { meta: meta.data(), mensajes, bitacora, versiones };
  }

  async borrarTodo() {
    if (!this.activa) return false;
    const { doc, getDocs, collection, deleteDoc } = this.fs;
    for (const c of ['mensajes', 'bitacora', 'versiones']) {
      const snap = await getDocs(collection(this.db, 'sesiones', this.uid, c));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(doc(this.db, 'sesiones', this.uid));
    return true;
  }
}

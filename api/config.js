// Entrega al navegador la configuración pública de Firebase (variable FIREBASE_CONFIG).
// La configuración web de Firebase identifica al proyecto y no es un secreto; la
// protección real de los datos está en las reglas de Firestore (firestore.rules).
import { leerFirebaseConfig } from '../lib/firebase-config.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ firebase: leerFirebaseConfig(process.env.FIREBASE_CONFIG) });
}

// Estado del servidor: indica si hay clave de Gemini y configuración de Firebase,
// sin revelar ningún valor secreto.
import { leerFirebaseConfig } from '../lib/firebase-config.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    ia: Boolean(process.env.GEMINI_API_KEY),
    modelo: process.env.GEMINI_MODEL || 'gemini-3.8-flash (con respaldo automático)',
    firebase: Boolean(leerFirebaseConfig(process.env.FIREBASE_CONFIG)),
    version: '1.0.0'
  });
}

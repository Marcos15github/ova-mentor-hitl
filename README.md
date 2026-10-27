# OVA-Mentor HITL

**Agente pedagógico inteligente para el acompañamiento socrático y la evaluación formativa en la producción ágil de Objetos Virtuales de Aprendizaje (OVA) en educación superior.**

Prototipo funcional (Evidencia 3, momento de Aplicación del modelo MOCAVI) del curso *IA en Educación II*, Maestría en Innovación Educativa con Tecnología e Inteligencia Artificial (MIETIA), Universidad de Córdoba.
Autores: Marcos Atencia Martínez y Daniel David Doria Díaz. Docente: Juan Carlos Giraldo Cardozo.

## Qué hace

| Función del diseño (Evidencias 1 y 2) | Cómo se implementa en el prototipo |
|---|---|
| Tutor socrático: pregunta antes de opinar | Prompt maestro ROCAS en el servidor (`lib/prompt.js`) y salida estructurada con `tipo_intervencion` |
| Pistas graduales, nunca la solución | Botón **Solicitar pista**: 3 niveles por tema (principio → elemento concreto → ejemplo análogo de otro tema) |
| Retroalimentación con la rúbrica | Base de conocimiento con la rúbrica F2-B y los principios de Mayer (`lib/kb.js`); cada respuesta muestra en qué se apoya |
| Validación humana obligatoria (HITL) | Cuando el agente marca `requiere_validacion_humana`, el estudiante registra su decisión APR/APM/ITE/DES en la bitácora (Matriz F2-A). No se puede aprobar sin marcar la verificación de fuentes |
| Iteraciones SAM2 | Panel de progreso Savvy Start → Alfa → Beta → Oro; cierre de versión con reflexión metacognitiva obligatoria |
| Autoevaluación | **Revisar avance**: rúbrica F2-B con descriptores, regla de decisión automática e índice CTML |
| Escalamiento al docente | Aviso y borrador de mensaje cuando la consulta excede al agente (calificaciones, contenido disciplinar, casos sensibles) |
| Trazabilidad | Firestore (si está configurado) + navegador; exportación CSV con los encabezados oficiales de F2-A, CSV de conversación, PDF y JSON |
| Privacidad (Ley 1581 de 2012) | Seudónimo, consentimiento informado, detector y enmascarado de correos, teléfonos y documentos, capturas no almacenadas, borrado de datos |

## Arquitectura

```
Navegador (index.html, css/, js/)
   │  fetch /api/chat  (mensaje, acción, contexto, historial, captura opcional)
   ▼
Función de servidor Vercel (api/chat.js)
   │  prompt ROCAS + base de conocimiento + esquema JSON de respuesta
   ▼
API de Gemini (modelo configurable, con modelos de respaldo)

Navegador ──► Firebase Auth anónima + Firestore  (sesiones/{uid}/mensajes|bitacora|versiones)
```

- **Sin clave de Gemini** el prototipo funciona en **modo demostración** (respuestas predefinidas, marcadas como «Simulado»).
- **Sin Firebase** la bitácora se guarda en el navegador y se puede exportar.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Valor |
|---|---|---|
| `GEMINI_API_KEY` | Sí, para IA real | Clave de Google AI Studio (https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Modelo preferido. Por defecto `gemini-3.8-flash`, con respaldo automático |
| `FIREBASE_CONFIG` | No | Pegar el objeto `firebaseConfig` que entrega la consola de Firebase (se acepta tal cual) |

## Firebase (opcional)

1. Crear un proyecto en https://console.firebase.google.com (sin Analytics).
2. *Authentication → Sign-in method →* habilitar **Anónimo**.
3. *Firestore Database →* crear base de datos en modo producción.
4. *Firestore → Reglas →* pegar el contenido de `firestore.rules` y publicar.
5. *Configuración del proyecto → Tus apps → Web →* registrar la app y copiar `firebaseConfig` en la variable `FIREBASE_CONFIG` de Vercel.
6. *Authentication → Settings → Dominios autorizados →* agregar el dominio `*.vercel.app` del proyecto.

## Ejecutar en local

```bash
npm run dev:mock   # IA simulada por el servidor local, para pruebas
npm run dev        # usa GEMINI_API_KEY del entorno si existe; si no, modo demostración
```

Abrir http://localhost:5173

## Estructura

```
api/chat.js        Conexión con Gemini (clave solo en el servidor)
api/health.js      Estado del servidor (IA y Firebase), sin revelar secretos
api/config.js      Configuración pública de Firebase
lib/kb.js          Base de conocimiento: rúbrica F2-B, Mayer, códigos F2-A, SAM2, C1–C7
lib/prompt.js      Prompt maestro ROCAS, instrucciones por acción, esquema de salida, enmascarado
js/app.js          Interfaz y flujo de interacción
js/store.js        Persistencia local y Firestore
js/demo.js         Modo demostración
js/exportar.js     CSV, PDF y JSON
js/privacidad.js   Detector de datos personales
firestore.rules    Reglas de seguridad
vendor/            Firebase JS SDK 13.1.0 y jsPDF 4.2.1 (sin dependencias de CDN)
```

## Limitaciones conocidas

- El límite de solicitudes por minuto es básico (en memoria por instancia).
- La autenticación anónima vincula la sesión a un navegador; no hay vista de docente dentro de la app (el equipo investigador consulta Firestore desde la consola).
- El agente no verifica la exactitud disciplinar: la exige al humano y la escala al docente.

## Licencia

MIT. Prototipo académico desarrollado con Vibe Coding asistido por IA y revisado por los autores.

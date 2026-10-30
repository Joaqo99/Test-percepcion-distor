// ============================================================
//  CONFIGURACIÓN DEL EXPERIMENTO  (lo único que normalmente hay que tocar)
// ============================================================
window.CONFIG = {
  // URL de la "aplicación web" de Google Apps Script que guarda las respuestas
  // en una Google Sheet (ver README.md, paso 3). Si queda vacío, las respuestas
  // NO se envían y el participante solo puede descargar un archivo.
  endpoint: "",

  // Horas mínimas sugeridas entre la Parte 1 y la Parte 2 (anti-fatiga auditiva).
  // Solo es un aviso (se detecta si usa el mismo navegador); no bloquea.
  minHorasEntrePartes: 24,

  // Archivo de calibración de nivel (se reproduce las veces que quiera).
  calibracion: "audio/calibracion.wav",

  partes: {
    1: {
      atributo: "brillante",      // palabra que aparece en la consigna y en las opciones
      comparativo: "más brillante",
      // 6 estímulos base (formato mp3/wav/ogg). Se arman solos los 15 pares A→B en orden aleatorio.
      estimulos: ["audio/p1/e1.wav", "audio/p1/e2.wav", "audio/p1/e3.wav", "audio/p1/e4.wav", "audio/p1/e5.wav", "audio/p1/e6.wav"]
    },
    2: {
      atributo: "potente",
      comparativo: "más potente",
      // 6 estímulos base (formato mp3/wav/ogg). Se arman solos los 15 pares A→B en orden aleatorio.
      estimulos: ["audio/p2/e1.wav", "audio/p2/e2.wav", "audio/p2/e3.wav", "audio/p2/e4.wav", "audio/p2/e5.wav", "audio/p2/e6.wav"]
    }
  }
};

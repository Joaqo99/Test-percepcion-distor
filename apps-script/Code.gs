/**
 * Recibe las respuestas del experimento (POST con JSON) y las guarda en una Google Sheet.
 * Una fila por comparación (par) respondida. Hojas "parte1" y "parte2" (se crean solas).
 * IMPORTANTE: si ya tenías hojas de una versión anterior, borralas para que se creen con las columnas nuevas.
 */
var CAB = ['recibido', 'parte', 'email', 'edad', 'toca_instrumento', 'instrumento', 'anios_instrumento',
  'genero_favorito', 'sistema_reproduccion', 'inicio', 'fin', 'plan_ok',
  'par_id', 'estimulo_i', 'estimulo_j', 'estimulo_A', 'estimulo_B', 'archivo_A', 'archivo_B',
  'orden_presentacion', 'respuesta_texto', 'respuesta_valor', 'valor_i_vs_j',
  'tiempo_ms', 'reproducciones', 'escuchado_completo'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nombre = 'parte' + p.parte;
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    if (hoja.getLastRow() === 0) hoja.appendRow(CAB);
    var ahora = new Date();
    var filas = p.respuestas.map(function (r) {
      return CAB.map(function (c) {
        if (c === 'recibido') return ahora;
        return r[c] !== undefined ? r[c] : (p[c] !== undefined ? p[c] : '');
      });
    });
    hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, CAB.length).setValues(filas);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

/** Menú en la Sheet: "Test > Verificar completitud" */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Test').addItem('Verificar completitud', 'verificarCompletitud').addToUi();
}

/**
 * Crea la hoja "verificacion": por participante y parte revisa que haya N(N-1)/2 pares distintos
 * y que cada estímulo haya aparecido N-1 veces. Cambiá N_ESTIMULOS si usás otra cantidad.
 */
function verificarCompletitud() {
  var N_ESTIMULOS = 6;
  var esperadosPares = N_ESTIMULOS * (N_ESTIMULOS - 1) / 2;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [['parte', 'email', 'filas', 'pares_distintos', 'pares_esperados', 'min_apariciones_estimulo', 'max_apariciones_estimulo', 'OK']];
  ['parte1', 'parte2'].forEach(function (nombre) {
    var h = ss.getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;
    var datos = h.getDataRange().getValues(), cab = datos[0], ix = {};
    cab.forEach(function (c, i) { ix[c] = i; });
    var g = {};
    datos.slice(1).forEach(function (f) {
      var k = f[ix.email] + '|' + f[ix.inicio];            // una "sesión" = email + hora de inicio
      g[k] = g[k] || { email: f[ix.email], filas: 0, pares: {}, ap: {} };
      var s = g[k]; s.filas++; s.pares[f[ix.par_id]] = true;
      [f[ix.estimulo_A], f[ix.estimulo_B]].forEach(function (id) { s.ap[id] = (s.ap[id] || 0) + 1; });
    });
    Object.keys(g).forEach(function (k) {
      var s = g[k], veces = [];
      for (var i = 1; i <= N_ESTIMULOS; i++) veces.push(s.ap[i] || 0);
      var np = Object.keys(s.pares).length, mn = Math.min.apply(null, veces), mx = Math.max.apply(null, veces);
      var ok = s.filas === esperadosPares && np === esperadosPares && mn === N_ESTIMULOS - 1 && mx === N_ESTIMULOS - 1;
      out.push([nombre, s.email, s.filas, np, esperadosPares, mn, mx, ok ? 'OK' : 'REVISAR']);
    });
  });
  var v = ss.getSheetByName('verificacion') || ss.insertSheet('verificacion');
  v.clear();
  v.getRange(1, 1, out.length, out[0].length).setValues(out);
}

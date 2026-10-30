# Test subjetivo – Percepción de distorsión en guitarra eléctrica (jsPsych 8)

## Estructura
- `index.html` – portada con links a las dos partes
- `parte1.html` – preguntas previas + calibración + test de **brillo**
- `parte2.html` – email + calibración + test de **potencia**
- `js/config.js` – **único archivo que hay que editar** (lista de audios, endpoint, horas entre partes)
- `js/experiment.js` – lógica del experimento
- `audio/` – audios (los actuales son **tonos de prueba**, reemplazalos)
- `apps-script/Code.gs` – script para guardar respuestas en Google Sheets
- `libs/` – jsPsych y plugins (incluidos localmente, no hace falta internet para cargarlos)

## 1. Reemplazar los audios
Cargá **6 estímulos base por test** (notas individuales, mp3/ogg/wav; **recomendado wav u ogg**: el mp3 puede sumar unos ms de relleno al decodificar). Todos deben tener el mismo recorte (el silencio inicial y el final incluidos) en `audio/p1/` (brillo) y `audio/p2/` (potencia),
más `audio/calibracion.*`, y actualizá los nombres en `js/config.js` (lista `estimulos`).
El programa genera solo los **15 pares** (todas las combinaciones de 6), y para cada participante:
- mezcla el orden de los 15 pares,
- sortea cuál estímulo va como A y cuál como B,
- reproduce A y B uno detrás del otro, sin pausa agregada: B arranca exactamente cuando termina A (Web Audio API). El único silencio entre notas es el que ya traen tus archivos al comienzo.
El estímulo 1 es el primero de la lista, el 2 el segundo, etc. (esos números aparecen en los datos).

## 2. Publicar en GitHub Pages
1. Creá un repositorio público en GitHub y subí **el contenido de esta carpeta** (que `index.html` quede en la raíz).
2. Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.
3. En 1–2 minutos queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

## 3. Guardar las respuestas (Google Sheets, gratis)
GitHub Pages es solo estático: no puede recibir datos. Opción simple:
1. Creá una Google Sheet nueva → Extensiones → Apps Script.
2. Pegá el contenido de `apps-script/Code.gs` y guardá.
3. Implementar → Nueva implementación → tipo *Aplicación web* → Ejecutar como: **yo** → Acceso: **Cualquier persona** → Implementar.
4. Copiá la URL (`https://script.google.com/macros/s/.../exec`) y pegala en `endpoint` de `js/config.js`.
5. Hacé un test completo y comprobá que aparezcan filas en las hojas `parte1` / `parte2`.

Si el envío falla, al final el participante puede descargar un CSV con sus respuestas.

## Vincular Parte 1 y Parte 2
Por email (normalizado a minúsculas). En el análisis, unís las hojas `parte1` y `parte2` por la columna `email`.
Al terminar la Parte 1 se ofrece un link a la Parte 2 con el email ya completado
(también podés mandar `parte2.html?email=persona@mail.com` por correo).

## Datos (una fila por comparación; 15 filas por participante y parte)
`par_id` (ej. "2-4"), `estimulo_i` / `estimulo_j` (i < j), `estimulo_A` / `estimulo_B` (primero/segundo en sonar),
`orden_presentacion`, `respuesta_texto`, `tiempo_ms`, `reproducciones`, `escuchado_completo`, `plan_ok`.
- `respuesta_valor`: -2 = A más (brillante/potente), -1 = A ligeramente más, 0 = iguales, +1 = B ligeramente más, +2 = B más.
- `valor_i_vs_j`: igual pero independiente de la posición A/B: +2 = el estímulo i tiene mucho más que el j, -2 = el j tiene mucho más. Conviene usar esta columna para el análisis.

## Verificar que se presentan todos los audios
1. Modo prueba: abrí `parte1.html?debug=1`. En la consola del navegador (F12) aparece la tabla con el plan de los 15 pares,
   y las respuestas quedan habilitadas sin escuchar (para recorrerlo rápido).
2. Automático: al iniciar se comprueba que hay 15 pares distintos y que cada estímulo aparece 5 veces (columna `plan_ok`).
3. En la Sheet: menú Test > Verificar completitud crea la hoja `verificacion` con filas, pares distintos y apariciones
   mínimas/máximas por estímulo de cada participante, con OK / REVISAR.
Si cambiás la cantidad de estímulos, cambiá `N_ESTIMULOS` en `Code.gs`.
Si ya creaste las hojas con la versión anterior, borralas para que se vuelvan a crear con las columnas nuevas.

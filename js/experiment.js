// ============================================================
//  Test subjetivo – Percepción de distorsión en guitarra eléctrica
//  jsPsych 8.  PARTE 1 = cuestionario + calibración + test de brillo
//              PARTE 2 = email + calibración + test de potencia
// ============================================================
(function () {
  const PARTE = window.PARTE;
  const CFG = window.CONFIG;
  const P = CFG.partes[PARTE];
  const params = new URLSearchParams(location.search);
  const LS_KEY = "distorsion_parte1_ts";

  const jsPsych = initJsPsych({
    show_progress_bar: true,
    auto_update_progress_bar: false,
    message_progress_bar: "Progreso"
  });

  const T0 = new Date();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const normEmail = (e) => String(e || "").trim().toLowerCase();

  // ---------- Escala de respuesta (valor numérico: -2 … +2; negativo = gana A) ----------
  const ESCALA = [
    { valor: -2, texto: `A es ${P.comparativo} que B` },
    { valor: -1, texto: `A es ligeramente ${P.comparativo} que B` },
    { valor: 0,  texto: "A y B son iguales" },
    { valor: 1,  texto: `B es ligeramente ${P.comparativo} que A` },
    { valor: 2,  texto: `B es ${P.comparativo} que A` }
  ];
  // Convención: valor < 0 → A tiene MÁS del atributo; valor > 0 → B tiene más; 0 → iguales.
  const valorDe = (idx) => ESCALA[idx].valor;

  // ---------- Motor de audio (Web Audio API) ----------
  // Los audios se decodifican en memoria y se programan en el reloj de audio, de modo que el
  // siguiente arranca EXACTAMENTE cuando termina el anterior (sin hueco). Cada archivo trae su propio
  // silencio inicial, así que ese es el único espacio que se oye entre A y B.
  const DEBUG = params.get("debug") === "1";
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  const cache = {};
  function cargar(src) {
    if (!ctx) ctx = new AC();
    if (!cache[src]) {
      cache[src] = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`No se encontró el archivo "${src}" (error ${r.status}). Revisá que exista y que el nombre en js/config.js coincida exactamente (mayúsculas y extensión).`);
          return r.arrayBuffer();
        }, () => {
          throw new Error(location.protocol === "file:"
            ? "La página está abierta como archivo local (file://), y el navegador bloquea los audios así. Abrila desde la URL de GitHub Pages (https://…github.io/…)."
            : `No se pudo descargar "${src}".`);
        })
        .then((buf) => new Promise((ok, err) => ctx.decodeAudioData(buf, ok, () => err(new Error(
          `El navegador no pudo decodificar "${src}". Exportalo como WAV PCM de 16 o 24 bits (sin comprimir) u OGG, y verificá que no esté dañado.`)))));
      cache[src].catch(() => { delete cache[src]; });
    }
    return cache[src];
  }

  // srcs: uno o varios archivos que suenan uno detrás de otro (para un par: [A, B]).
  // La respuesta se habilita tras escuchar la secuencia completa (o al empezar, si requerirFinal = false).
  function audioTrial({ srcs, etiquetas, prompt, choices, requerirFinal, data, onFinish }) {
    let reproducciones = 0, completo = false, fuentes = [], timers = [];
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus:
        `<div class="aud"><p>${prompt}</p>
           <div id="lbl" class="lbl">&nbsp;</div>
           <button type="button" id="play" class="play" disabled>Cargando…</button>
           <p class="small" id="estado">Escuchá el audio completo para habilitar las respuestas.</p></div>`,
      choices,
      button_layout: "grid",
      grid_columns: 1,
      data,
      on_load: () => {
        const play = document.getElementById("play");
        const estado = document.getElementById("estado");
        const lbl = document.getElementById("lbl");
        const botones = () => document.querySelectorAll("#jspsych-html-button-response-btngroup button");
        const habilitar = (v) => botones().forEach((b) => (b.disabled = !v));
        habilitar(DEBUG);
        const error = () => { estado.innerHTML = '<span class="err">No se pudo cargar el audio. Recargá la página o avisá al responsable.</span>'; };

        Promise.all(srcs.map(cargar)).then((buffers) => {
          play.disabled = false; play.textContent = "▶ Reproducir";
          play.addEventListener("click", async () => {
            await ctx.resume();
            reproducciones++; play.disabled = true; play.textContent = "Reproduciendo…";
            if (!requerirFinal) { habilitar(true); estado.textContent = ""; }
            let t = ctx.currentTime + 0.05;            // inicio programado
            const t0 = t, programa = [];
            fuentes = []; timers.forEach(clearTimeout); timers = [];
            buffers.forEach((buf, i) => {
              const src = ctx.createBufferSource();
              src.buffer = buf; src.connect(ctx.destination);
              src.start(t);                             // B empieza justo donde termina A
              fuentes.push(src);
              programa.push({ inicio: t, duracion: buf.duration });
              const ms = (t - ctx.currentTime) * 1000;
              if (etiquetas) timers.push(setTimeout(() => { lbl.textContent = etiquetas[i]; }, Math.max(0, ms)));
              t += buf.duration;
            });
            window.__programa = programa;               // para verificar (consola)
            const ultimo = fuentes[fuentes.length - 1];
            ultimo.onended = () => {
              lbl.innerHTML = "&nbsp;"; completo = true; play.disabled = false;
              play.textContent = "↻ Reproducir de nuevo"; habilitar(true); estado.textContent = "";
            };
          });
        }).catch((e) => { console.error(e); error(); });
      },
      on_finish: (d) => {
        fuentes.forEach((f) => { try { f.stop(); } catch (e) {} });
        timers.forEach(clearTimeout);
        d.reproducciones = reproducciones;
        d.escuchado_completo = completo;
        if (onFinish) onFinish(d);
      }
    };
  }

  // ---------- Pantallas ----------
  const bienvenida = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="card">
      <h2>Percepción de distorsión en guitarra eléctrica – Parte ${PARTE}</h2>
      <p>Este test forma parte de un trabajo de la carrera de Ingeniería de Sonido (Universidad Nacional de Tres de Febrero).
         Los resultados se usarán únicamente con fines educativos y no se publicarán datos personales.</p>
      <p>Se recomienda <b>usar auriculares</b>, en un lugar tranquilo. Dura unos 10 minutos.</p>
      <p class="small">La participación es voluntaria. Al continuar aceptás que tus respuestas se usen con este fin.</p>
    </div>`,
    choices: ["Acepto y continuo"]
  };

  // Aviso suave de fatiga (solo Parte 2, mismo navegador)
  const avisoFatiga = {
    timeline: [{
      type: jsPsychHtmlButtonResponse,
      stimulus: () => {
        const h = ((Date.now() - Number(localStorage.getItem(LS_KEY))) / 36e5).toFixed(1);
        return `<div class="card"><h3>Pasaron solo ${h} h desde la Parte 1</h3>
          <p>Para evitar la fatiga auditiva te pedimos esperar al menos ${CFG.minHorasEntrePartes} horas entre las dos partes.</p></div>`;
      },
      choices: ["Volver más tarde", "Continuar de todos modos"],
      on_finish: (d) => { if (d.response === 0) { jsPsych.abortExperiment("Podés cerrar esta ventana y volver más tarde. ¡Gracias!"); } }
    }],
    conditional_function: () => {
      try {
        const ts = Number(localStorage.getItem(LS_KEY));
        return PARTE === 2 && ts && (Date.now() - ts) / 36e5 < CFG.minHorasEntrePartes;
      } catch (e) { return false; }
    }
  };

  const reqTxt = "Esta pregunta es obligatoria.";
  const preguntasParte1 = {
    type: jsPsychSurvey,
    survey_json: {
      title: "Preguntas previas",
      completeText: "Continuar",
      showQuestionNumbers: "off",
      requiredText: "",
      elements: [
        { type: "text", name: "email", title: "Correo electrónico", inputType: "email", isRequired: true, requiredErrorText: reqTxt,
          description: "Se usa únicamente para vincular tus respuestas de la Parte 1 y la Parte 2.",
          defaultValue: params.get("email") || "" },
        { type: "text", name: "edad", title: "Edad", inputType: "number", min: 5, max: 120, isRequired: true, requiredErrorText: reqTxt },
        { type: "radiogroup", name: "toca_instrumento", title: "¿Tocás algún instrumento musical?", isRequired: true, requiredErrorText: reqTxt,
          choices: ["Sí", "No"] },
        { type: "text", name: "instrumento", title: "¿Qué instrumento tocás?", isRequired: true, requiredErrorText: reqTxt,
          visibleIf: "{toca_instrumento} = 'Sí'" },
        { type: "text", name: "anios_instrumento", title: "¿Cuántos años hace que lo tocás?", inputType: "number", min: 0, max: 100, isRequired: true, requiredErrorText: reqTxt,
          visibleIf: "{toca_instrumento} = 'Sí'" },
        { type: "text", name: "genero_favorito", title: "Género musical favorito", isRequired: true, requiredErrorText: reqTxt },
        { type: "radiogroup", name: "sistema_reproduccion", title: "Sistema de reproducción para el test (se recomiendan auriculares)", isRequired: true, requiredErrorText: reqTxt,
          choices: ["Parlantes del celular", "Parlantes", "Auriculares"], showOtherItem: true, otherText: "Otro", otherPlaceholder: "Especificá cuál" }
      ]
    },
    data: { tarea: "preguntas_previas" }
  };

  const preguntasParte2 = {
    type: jsPsychSurvey,
    survey_json: {
      title: "Identificación",
      description: "Usá el mismo correo electrónico que en la Parte 1, para poder vincular tus respuestas.",
      completeText: "Continuar",
      showQuestionNumbers: "off",
      requiredText: "",
      elements: [
        { type: "text", name: "email", title: "Correo electrónico", inputType: "email", isRequired: true, requiredErrorText: reqTxt,
          defaultValue: params.get("email") || "" },
        { type: "radiogroup", name: "sistema_reproduccion", title: "Sistema de reproducción para el test (se recomiendan auriculares)", isRequired: true, requiredErrorText: reqTxt,
          choices: ["Parlantes del celular", "Parlantes", "Auriculares"], showOtherItem: true, otherText: "Otro", otherPlaceholder: "Especificá cuál" }
      ]
    },
    data: { tarea: "identificacion" }
  };

  const calibracion = [
    {
      type: jsPsychHtmlButtonResponse,
      stimulus: `<div class="card"><h2>Calibración de nivel</h2>
        <p>A continuación se reproduce un sonido de referencia. Ajustá el volumen de tu dispositivo a un nivel <b>cómodo</b> mientras suena
           (podés repetirlo las veces que quieras).</p>
        <p><b>No cambies el volumen una vez que empiece el test.</b></p></div>`,
      choices: ["Entendido"]
    },
    audioTrial({
      srcs: [CFG.calibracion],
      prompt: "Sonido de calibración",
      choices: ["Ya ajusté el volumen, comenzar el test"],
      requerirFinal: false,
      data: { tarea: "calibracion" }
    })
  ];

  const instrucciones = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="card"><h2>Test subjetivo</h2>
      <p>En cada ítem escucharás <b>dos notas de guitarra</b> una detrás de otra: la primera es la <b>A</b> y la segunda es la <b>B</b>.</p>
      <p>Indicá cuál suena más <b>${P.atributo}</b> según tu propia comprensión de ese concepto.</p>
      <p>Podés volver a escuchar cada audio. Las respuestas se habilitan después de escucharlo completo una vez.</p></div>`,
    choices: ["Comenzar"]
  };

  // ---------- Pares: todas las combinaciones de los estímulos base, en orden y posición A/B aleatorios ----------
  const estimulos = P.estimulos.map((f, i) => ({ id: i + 1, archivo: f }));
  const n = estimulos.length;
  const pares = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pares.push({ i: estimulos[i], j: estimulos[j] });
  const plan = jsPsych.randomization.shuffle(pares).map((p) => (Math.random() < 0.5 ? { A: p.i, B: p.j, i: p.i, j: p.j } : { A: p.j, B: p.i, i: p.i, j: p.j }));
  const total = plan.length;

  // Verificación del plan: n(n-1)/2 pares distintos y cada estímulo aparece exactamente n-1 veces
  (function verificarPlan() {
    const vistos = new Set(plan.map((p) => `${p.i.id}-${p.j.id}`));
    const cuenta = {}; plan.forEach((p) => { cuenta[p.A.id] = (cuenta[p.A.id] || 0) + 1; cuenta[p.B.id] = (cuenta[p.B.id] || 0) + 1; });
    const ok = vistos.size === (n * (n - 1)) / 2 && estimulos.every((e) => cuenta[e.id] === n - 1);
    window.__planOK = ok;
    if (!ok) console.error("PLAN INCOMPLETO", { vistos: [...vistos], cuenta });
    if (DEBUG) console.table(plan.map((p, k) => ({ orden: k + 1, A: p.A.id, B: p.B.id, par: `${p.i.id}-${p.j.id}` })));
  })();

  const trialsItems = plan.map((p, k) => audioTrial({
    srcs: [p.A.archivo, p.B.archivo],
    etiquetas: ["A", "B"],
    prompt: `Ítem ${k + 1} de ${total} &nbsp;–&nbsp; ¿Cómo calificarías los sonidos?`,
    choices: ESCALA.map((e) => e.texto),
    requerirFinal: true,
    data: {
      tarea: "item", par_id: `${p.i.id}-${p.j.id}`, estimulo_i: p.i.id, estimulo_j: p.j.id,
      estimulo_A: p.A.id, estimulo_B: p.B.id, archivo_A: p.A.archivo, archivo_B: p.B.archivo, orden_presentacion: k + 1
    },
    onFinish: (d) => {
      d.respuesta_texto = ESCALA[d.response].texto;
      d.respuesta_valor = valorDe(d.response);            // <0: A más; >0: B más
      // Valor "canónico": >0 si el estímulo de menor id (i) tiene MÁS del atributo que el de mayor id (j)
      d.valor_i_vs_j = p.A.id === p.i.id ? -d.respuesta_valor : d.respuesta_valor;
      jsPsych.progressBar.progress = (k + 1) / total;
    }
  }));

  const preload = {
    type: jsPsychHtmlKeyboardResponse,
    choices: "NO_KEYS",
    stimulus: '<div class="card center"><p id="msgcarga">Cargando audios…</p></div>',
    on_load: () => {
      Promise.allSettled([CFG.calibracion, ...P.estimulos].map(cargar)).then((res) => {
        const fallos = res.filter((r) => r.status === "rejected");
        if (!fallos.length) return jsPsych.finishTrial();
        const msgs = [...new Set(fallos.map((f) => esc(f.reason.message)))];
        document.getElementById("msgcarga").innerHTML =
          `<span class="err"><b>No se pudieron cargar los audios.</b></span><ul style="text-align:left">${msgs.map((m) => `<li>${m}</li>`).join("")}</ul>`;
      });
    }
  };

  // ---------- Envío de datos ----------
  let payload = null, enviado = false;
  function armarPayload() {
    const previas = jsPsych.data.get().filter({ tarea: PARTE === 1 ? "preguntas_previas" : "identificacion" }).values()[0];
    const r = (previas && previas.response) || {};
    const sistema = r.sistema_reproduccion === "other" ? `Otro: ${r["sistema_reproduccion-Comment"] || ""}` : r.sistema_reproduccion;
    const respuestas = jsPsych.data.get().filter({ tarea: "item" }).values().map((d) => ({
      par_id: d.par_id, estimulo_i: d.estimulo_i, estimulo_j: d.estimulo_j, estimulo_A: d.estimulo_A, estimulo_B: d.estimulo_B,
      archivo_A: d.archivo_A, archivo_B: d.archivo_B, orden_presentacion: d.orden_presentacion,
      respuesta_texto: d.respuesta_texto, respuesta_valor: d.respuesta_valor, valor_i_vs_j: d.valor_i_vs_j,
      tiempo_ms: d.rt, reproducciones: d.reproducciones, escuchado_completo: d.escuchado_completo
    }));
    return {
      parte: PARTE, atributo: P.atributo,
      email: normEmail(r.email),
      edad: r.edad ?? "", toca_instrumento: r.toca_instrumento ?? "", instrumento: r.instrumento ?? "",
      anios_instrumento: r.anios_instrumento ?? "", genero_favorito: r.genero_favorito ?? "",
      sistema_reproduccion: sistema || "", plan_ok: window.__planOK === true,
      inicio: T0.toISOString(), fin: new Date().toISOString(),
      user_agent: navigator.userAgent,
      respuestas
    };
  }
  function aCSV(p) {
    const cab = ["parte", "email", "edad", "toca_instrumento", "instrumento", "anios_instrumento", "genero_favorito", "sistema_reproduccion",
      "par_id", "estimulo_i", "estimulo_j", "estimulo_A", "estimulo_B", "archivo_A", "archivo_B", "orden_presentacion", "respuesta_texto", "respuesta_valor", "valor_i_vs_j", "tiempo_ms", "reproducciones", "escuchado_completo"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = p.respuestas.map((x) => cab.map((c) => q(x[c] !== undefined ? x[c] : p[c])).join(","));
    return [cab.join(","), ...filas].join("\n");
  }
  async function enviar(p) {
    if (!CFG.endpoint) return false;
    try {
      await fetch(CFG.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(p) });
      return true;
    } catch (e) { return false; }
  }

  const envio = {
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      payload = armarPayload();
      window.__payload = payload; // útil para depurar
      enviar(payload).then((ok) => { enviado = ok; done(); });
    }
  };

  const final = {
    type: jsPsychHtmlKeyboardResponse,
    choices: "NO_KEYS",
    stimulus: () => {
      try { if (PARTE === 1) localStorage.setItem(LS_KEY, String(Date.now())); } catch (e) {}
      const url = URL.createObjectURL(new Blob(["﻿" + aCSV(payload)], { type: "text/csv;charset=utf-8" }));
      const nombre = `respuestas_parte${PARTE}.csv`;
      const estado = enviado
        ? "<p>Tus respuestas fueron enviadas correctamente.</p>"
        : `<p class="err">No se pudieron enviar automáticamente tus respuestas. Descargá el archivo y mandalo por correo al responsable del estudio.</p>`;
      const siguiente = PARTE === 1
        ? `<p>Para la <b>Parte 2</b>, volvé en otro momento (idealmente después de ${CFG.minHorasEntrePartes} horas) para evitar la fatiga auditiva.</p>
           <p class="center"><a class="btnlink" href="parte2.html?email=${encodeURIComponent(payload.email)}">Ir a la Parte 2</a></p>`
        : "";
      return `<div class="card"><h2>¡Gracias por participar!</h2>${estado}${siguiente}
        <p class="small center"><a href="${url}" download="${nombre}">Descargar copia de mis respuestas (.csv)</a></p></div>`;
    }
  };

  // ---------- Timeline ----------
  const timeline = [preload, bienvenida, avisoFatiga,
    PARTE === 1 ? preguntasParte1 : preguntasParte2,
    ...calibracion, instrucciones, ...trialsItems, envio, final];

  jsPsych.run(timeline);
})();

const EXAMPLES = {
  spam: {
    label: "Filtro de spam (correo)",
    state: {
      from: "promo@ofertas-increibles.biz",
      subject: "¡¡FELICIDADES!! Has GANADO un iPhone 16 — reclama en 24h",
      body: "Estimado usuario, has sido seleccionado. Haz clic aquí http://bit.ly/x9z y envía tus datos bancarios para recibir el premio. Oferta limitada!!!"
    },
    questions: {
      es_spam: {
        type: "noul",
        instructions: "¿Es este correo spam o correo no deseado (publicidad masiva, estafa, phishing)?"
      },
      categoria: {
        type: "choice",
        instructions: "¿Qué tipo de correo es?",
        criteria: {
          legitimo: "correo personal o de trabajo real, esperado por el destinatario",
          publicidad: "marketing o promociones comerciales no solicitadas",
          phishing: "intenta robar credenciales, datos bancarios o dinero",
          notificacion: "aviso automático de un servicio (factura, envío, contraseña)"
        }
      },
      urgencia_artificial: {
        type: "score",
        instructions: "¿Cuánta presión o urgencia artificial usa el mensaje?",
        criteria: ["ninguna", "algo de presión", "urgencia extrema o amenaza"]
      },
      pide_datos: {
        type: "noul",
        instructions: "¿Pide el mensaje datos personales, contraseñas o información bancaria?"
      }
    }
  },
  soporte: {
    label: "Triaje de ticket de soporte",
    state: {
      from: "cliente@acme.com",
      subject: "Cobro duplicado en factura #4411",
      body: "Hola, nos habéis cobrado dos veces en marzo. Devolved el duplicado hoy o cancelamos el plan."
    },
    questions: {
      departamento: {
        type: "choice",
        instructions: "¿Qué departamento debe atender esta solicitud?",
        criteria: { facturacion: "facturas, pagos, reembolsos", tecnico: "errores, caídas del sistema", ventas: "precios, nuevos contratos", otro: "todo lo demás" }
      },
      urgencia: { type: "score", instructions: "¿Cómo de urgente es?", criteria: ["no urgente", "pronto", "crítico o bloqueante"] },
      riesgo_baja: { type: "noul", instructions: "¿Amenaza el usuario con cancelar o irse?" },
      pide_reembolso: { type: "noul", instructions: "¿Pide el usuario explícitamente un reembolso?" }
    }
  },
  moderacion: {
    label: "Moderación de comentarios",
    state: "Eres un inútil y todo el mundo lo sabe, deberías desaparecer de este foro.",
    questions: {
      toxico: { type: "noul", instructions: "¿Es el comentario tóxico, insultante o acosador?" },
      gravedad: { type: "score", instructions: "¿Qué gravedad tiene el contenido?", criteria: ["inofensivo", "grosero", "acoso o amenaza"] },
      accion: { type: "choice", instructions: "¿Qué acción de moderación corresponde?", criteria: { publicar: "no hace falta hacer nada", revisar: "un humano debe revisarlo", bloquear: "ocultar y sancionar" } }
    }
  }
};

const $ = (id) => document.getElementById(id);
const stateEl = $("state"), qEl = $("questions"), runBtn = $("run"), statusEl = $("status");
const results = $("results"), latency = $("latency"), qerror = $("qerror"), exSel = $("example");

for (const [k, v] of Object.entries(EXAMPLES)) exSel.add(new Option(v.label, k));

function loadExample(key) {
  const ex = EXAMPLES[key];
  stateEl.value = typeof ex.state === "string" ? ex.state : JSON.stringify(ex.state, null, 2);
  qEl.value = JSON.stringify(ex.questions, null, 2);
  qerror.textContent = "";
}
$("load-example").onclick = () => loadExample(exSel.value);
loadExample("spam");

function parseState(text) {
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) { try { return JSON.parse(t); } catch { /* treat as text */ } }
  return t;
}

async function poll() {
  try {
    const s = await (await fetch("/api/status")).json();
    if (s.error) { statusEl.textContent = "Error cargando modelo: " + s.error; statusEl.className = "bad"; return; }
    if (s.ready) {
      statusEl.textContent = `Modelo ${s.model}${s.subfolder ? "/" + s.subfolder : ""} en CPU · cargado en ${s.load_seconds}s`;
      statusEl.className = "ok"; runBtn.disabled = false; return;
    }
    statusEl.textContent = "Cargando modelo en CPU (primera vez descarga ~650 MB)…"; statusEl.className = "warn";
  } catch { statusEl.textContent = "Servidor no responde"; statusEl.className = "bad"; }
  setTimeout(poll, 1500);
}
poll();

function pct(v) { return (v * 100).toFixed(1) + " %"; }
function bar(v) { return `<div class="bar"><i style="width:${(v * 100).toFixed(1)}%"></i></div>`; }

function renderAnswer(id, a) {
  let body = "";
  if (a.type === "noul") {
    const yes = a.noul >= 0.5;
    body = `<div class="verdict" style="color:${yes ? "var(--bad)" : "var(--ok)"}">${yes ? "SÍ" : "NO"} <span class="meta">P(sí) = ${pct(a.noul)}</span></div>${bar(a.noul)}`;
  } else if (a.type === "choice") {
    body = `<div class="verdict">${a.choice}</div>` +
      Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])
        .map(([k, v]) => `<div class="prob"><span>${k}</span><span>${pct(v)}</span></div>${bar(v)}`).join("");
  } else if (a.type === "score") {
    const n = Object.keys(a.legend).length - 1;
    const nearest = a.legend[String(Math.round(a.score))];
    body = `<div class="verdict">${a.score.toFixed(2)} / ${n} <span class="meta">≈ ${nearest}</span></div>` +
      Object.entries(a.probabilities)
        .map(([k, v]) => `<div class="prob"><span>${k} · ${a.legend[k]}</span><span>${pct(v)}</span></div>${bar(v)}`).join("");
  }
  return `<div class="card"><div class="title"><span>${id} <span class="type">${a.type}</span></span><span class="meta">confianza ${pct(a.confidence)}</span></div>${body}</div>`;
}

runBtn.onclick = async () => {
  let questions;
  qerror.textContent = "";
  try { questions = JSON.parse(qEl.value); } catch (e) { qerror.textContent = "JSON inválido: " + e.message; return; }
  runBtn.disabled = true; latency.textContent = "Evaluando…"; results.innerHTML = "";
  try {
    const r = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: parseState(stateEl.value), questions }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || r.statusText);
    results.innerHTML = Object.entries(data.answers).map(([id, a]) => renderAnswer(id, a)).join("") +
      `<details><summary class="meta">JSON completo</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>`;
    latency.textContent = `${data.latency_ms} ms · ${data.usage.input_tokens} tokens`;
  } catch (e) {
    results.innerHTML = `<div class="error">${e.message}</div>`; latency.textContent = "";
  } finally { runBtn.disabled = false; }
};

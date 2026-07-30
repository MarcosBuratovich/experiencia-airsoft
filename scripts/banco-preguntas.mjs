/**
 * Banco de regresión del asistente. Corre contra la API real: cuesta plata
 * (unos centavos) y hay que correrlo ante cada cambio del prompt o de la
 * base de conocimiento.
 *
 *   pnpm banco            todos
 *   pnpm banco cumple     solo los casos cuyo id contenga "cumple"
 *
 * Requiere el motor compilado en .banco/ (ver el script "banco" de
 * package.json, que corre esbuild antes que este archivo).
 */
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const casos = JSON.parse(readFileSync("scripts/banco-preguntas.json", "utf8"));
const filtro = process.argv[2];
const aCorrer = filtro ? casos.filter((c) => c.id.includes(filtro)) : casos;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// El motor es TypeScript. Se compila aparte a .banco/ (ver package.json).
const { generarRespuesta } = await import("../.banco/motor.mjs");
const { getConocimiento, getConocimientoResultado, formatearConocimiento } =
  await import("../.banco/conocimiento.mjs");
const { costoDeUso } = await import("../.banco/topes.mjs");

const resultadoConocimiento = await getConocimientoResultado(supabase);
const conocimiento = formatearConocimiento(await getConocimiento(supabase));
const modelo = process.env.BOT_MODELO ?? "claude-sonnet-5";

// Diagnóstico: distingue "tabla sin filas" de "la consulta falló" (p.ej.
// bot_conocimiento no existe todavía — PGRST205). Las dos caen a la misma
// base de conocimiento vacía por diseño (getConocimiento nunca rechaza), pero
// para leer el informe del banco importa saber cuál pasó.
if (!resultadoConocimiento.ok) {
  console.log(
    "⚠ Base de conocimiento: la consulta FALLÓ (tabla ausente o error de permisos). " +
      "Los casos que dependen de ella van a fallar por eso, no por el prompt.\n",
  );
} else if (resultadoConocimiento.entradas.length === 0) {
  console.log("⚠ Base de conocimiento: tabla vacía (0 entradas activas).\n");
} else {
  console.log(
    `Base de conocimiento: ${resultadoConocimiento.entradas.length} entradas activas.\n`,
  );
}

let pasaron = 0;
const fallas = [];

// Acumulado de TODA la corrida — no solo el último turno de cada caso — para
// poder anotar el costo real. `generarRespuesta` ya suma internamente las
// vueltas de herramienta de una misma llamada; acá sumamos across llamadas
// (todos los turnos de todos los casos).
const usoTotal = { entrada: 0, salida: 0, cacheLectura: 0, cacheEscritura: 0 };
const usoPorCaso = {};

for (const caso of aCorrer) {
  const historial = [];
  const dichos = [];
  let ultima = null;
  const usoCaso = { entrada: 0, salida: 0, cacheLectura: 0, cacheEscritura: 0 };

  for (const texto of caso.mensajes) {
    historial.push({ rol: "usuario", texto, creado_at: new Date().toISOString() });
    ultima = await generarRespuesta(
      { anthropic, supabase, modelo },
      { historial, conocimiento },
    );

    // Sumar el costo de ESTE turno al total de la corrida y al del caso.
    for (const k of Object.keys(usoTotal)) {
      usoTotal[k] += ultima.uso[k];
      usoCaso[k] += ultima.uso[k];
    }

    // Las dos variantes traen texto; en la escalada por falla técnica es null.
    const salida = ultima.texto ?? "";
    if (salida) {
      historial.push({ rol: "bot", texto: salida, creado_at: new Date().toISOString() });
      dichos.push(salida);
    }
  }

  usoPorCaso[caso.id] = usoCaso;

  const problemas = [];
  const e = caso.espera;
  const escalo = ultima.tipo === "escalar";
  const texto = dichos.join("\n");

  if (e.escala !== undefined && escalo !== e.escala) {
    problemas.push(escalo ? "escaló y no debía" : "no escaló y debía");
  }
  for (const frag of e.menciona ?? []) {
    if (!texto.includes(frag)) problemas.push(`no dijo "${frag}"`);
  }
  for (const frag of e.noMenciona ?? []) {
    if (texto.includes(frag)) problemas.push(`dijo "${frag}" y no debía`);
  }
  if (e.intencion && ultima.clasificacion.intencion !== e.intencion) {
    problemas.push(`intención ${ultima.clasificacion.intencion} ≠ ${e.intencion}`);
  }
  if (e.duda && ultima.clasificacion.duda_principal !== e.duda) {
    problemas.push(`duda ${ultima.clasificacion.duda_principal} ≠ ${e.duda}`);
  }
  if (e.grupo && ultima.clasificacion.grupo_tam !== e.grupo) {
    problemas.push(`grupo ${ultima.clasificacion.grupo_tam} ≠ ${e.grupo}`);
  }
  if (e.primeraVez && ultima.clasificacion.primera_vez !== e.primeraVez) {
    problemas.push(
      `primera_vez ${ultima.clasificacion.primera_vez} ≠ ${e.primeraVez}`,
    );
  }

  // Anti-repetición: la regla que el cliente nos marcó como el problema de
  // los bots que probó.
  if (e.sinResaludar && dichos.length > 1) {
    const saludos = dichos.filter((t) => /^\s*(hola|buenas|qué tal)/i.test(t));
    if (saludos.length > 1) problemas.push("volvió a saludar");
  }
  if (e.sinRepetir) {
    const lineas = dichos.flatMap((t) =>
      t.split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l.length > 25),
    );
    const vistas = new Set();
    for (const l of lineas) {
      if (vistas.has(l)) problemas.push(`repitió: "${l.slice(0, 50)}…"`);
      vistas.add(l);
    }
  }

  if (problemas.length) {
    fallas.push({ id: caso.id, problemas, dichos });
    console.log(`✗ ${caso.id} — ${problemas.join(" · ")}`);
  } else {
    pasaron++;
    console.log(`✓ ${caso.id}`);
  }
}

console.log(`\n${pasaron}/${aCorrer.length} pasaron`);
if (fallas.length) {
  console.log("\nDetalle de las fallas:\n");
  for (const f of fallas) {
    console.log(`— ${f.id}`);
    for (const d of f.dichos) console.log(`    ${d.replace(/\n/g, "\n    ")}`);
    console.log();
  }
}

// --- Costo real de la corrida --------------------------------------------
const costoTotal = costoDeUso(modelo, usoTotal);
const costoPorCaso = aCorrer.length ? costoTotal / aCorrer.length : 0;

console.log("--- Costo (modelo: " + modelo + ") ---");
console.log(
  `Tokens: ${usoTotal.entrada} entrada · ${usoTotal.salida} salida · ` +
    `${usoTotal.cacheLectura} cache-lectura · ${usoTotal.cacheEscritura} cache-escritura`,
);
console.log(`Costo total de la corrida: USD ${costoTotal.toFixed(6)}`);
console.log(
  `Costo por caso (total / ${aCorrer.length}): USD ${costoPorCaso.toFixed(6)}`,
);

// Diagnóstico aparte: el banco tiene 29 casos de UN mensaje y uno solo
// ("sin-repetir") de 5 — no es comparable 1 a 1 con una "conversación típica
// de 3 intercambios" de la propuesta. Se imprime el costo de ESE caso solo
// como proxy más realista de una conversación multi-turno.
if (usoPorCaso["sin-repetir"]) {
  const costoHilo = costoDeUso(modelo, usoPorCaso["sin-repetir"]);
  console.log(
    `Costo del caso "sin-repetir" (5 mensajes, el único hilo largo del banco): ` +
      `USD ${costoHilo.toFixed(6)}`,
  );
}

if (fallas.length) process.exit(1);

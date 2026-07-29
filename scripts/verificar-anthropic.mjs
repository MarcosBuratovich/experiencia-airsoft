/**
 * Verifica que la API key de Anthropic funcione, antes de que exista el bot.
 *
 * Manda una consulta parecida a las que va a recibir el asistente y reporta la
 * respuesta, los tokens y el costo real de esa llamada. Sirve para separar tres
 * fallas que desde afuera se ven iguales: key mal copiada, sin crédito cargado,
 * o key de otro workspace.
 *
 *   pnpm verificar:anthropic                  (sonnet 5, el del presupuesto)
 *   pnpm verificar:anthropic claude-opus-5
 *
 * Ver docs/anthropic-api-setup.md
 */
import Anthropic from "@anthropic-ai/sdk";

// Precios por millón de tokens (tabla de Anthropic, junio 2026).
const PRECIOS = {
  "claude-opus-5": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 2, out: 10, nota: "precio de lanzamiento hasta el 2026-08-31; después 3 / 15" },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

const MODELO = process.argv[2] ?? "claude-sonnet-5";

// El proyecto guarda las variables en .env.local (Next las lee de ahí).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No existe o no se puede leer: seguimos con lo que haya en el entorno.
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error(
    "\n✗ Falta ANTHROPIC_API_KEY.\n\n" +
      "  Ponela en .env.local (para probar acá) y en Vercel (para producción).\n" +
      "  Cómo obtenerla: docs/anthropic-api-setup.md\n",
  );
  process.exit(1);
}
if (!key.startsWith("sk-ant-")) {
  console.error(
    "\n✗ La key no arranca con 'sk-ant-'. Puede estar cortada al copiarla,\n" +
      "  o ser una key de otro servicio.\n",
  );
  process.exit(1);
}

// Prompt chico pero representativo: instrucciones + un dato de negocio, como
// va a ser en producción.
const SISTEMA = `Sos el asistente de Experiencia Airsoft, una cancha de airsoft en Buenos Aires.
Contestás por Instagram: mensajes cortos, de 2 o 3 líneas, en voseo, sin sonar corporativo.
Datos de hoy: entrada con equipo propio $18.000 en efectivo o $20.000 por transferencia.
El alquiler del equipo completo sale $15.000. La próxima partida abierta es el sábado a las 14.
Nunca inventes un precio que no esté acá arriba.`;

const CONSULTA = "hola! cuanto sale ir a jugar si no tengo nada de equipo?";

const anthropic = new Anthropic({ apiKey: key });

console.log(`\n→ Modelo: ${MODELO}`);
console.log(`→ Consulta: "${CONSULTA}"\n`);

const arrancado = process.hrtime.bigint();

let msg;
try {
  msg = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 300,
    system: SISTEMA,
    messages: [{ role: "user", content: CONSULTA }],
  });
} catch (err) {
  const status = err?.status;
  const detalle = err?.error?.error?.message ?? err?.message ?? String(err);

  const diagnostico =
    status === 401
      ? "La key es inválida o fue revocada. Generá una nueva en la Consola."
      : status === 400 && /credit|balance/i.test(detalle)
        ? "La key funciona pero la organización no tiene crédito. Cargalo en Settings > Billing."
        : status === 404
          ? `El modelo "${MODELO}" no existe o no está habilitado en esta cuenta.`
          : status === 429
            ? "Límite de tasa alcanzado. Esperá unos segundos y probá de nuevo."
            : "Revisá la conexión y el estado de la API.";

  console.error(`✗ Falló (HTTP ${status ?? "sin status"}).\n`);
  console.error(`  Anthropic dice: ${detalle}\n`);
  console.error(`  ${diagnostico}\n`);
  process.exit(1);
}

const ms = Number(process.hrtime.bigint() - arrancado) / 1e6;
const texto = msg.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("");

const { input_tokens: entrada, output_tokens: salida } = msg.usage;
const precio = PRECIOS[MODELO];
const costo = precio
  ? (entrada / 1e6) * precio.in + (salida / 1e6) * precio.out
  : null;

console.log("✓ La key funciona.\n");
console.log("  Contestó:");
console.log(
  texto
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n"),
);
console.log(`\n  Tokens: ${entrada} de entrada, ${salida} de salida`);
console.log(`  Demora: ${ms.toFixed(0)} ms`);

if (costo !== null) {
  // A estos volúmenes el número por llamada es ilegible en dólares.
  console.log(`  Costo de esta llamada: USD ${costo.toFixed(6)}`);
  console.log(`  Mil consultas así: USD ${(costo * 1000).toFixed(2)}`);
  if (precio.nota) console.log(`  (${precio.nota})`);
} else {
  console.log(`  Sin precio conocido para ${MODELO} en este script.`);
}

console.log(
  "\n  Ojo: una conversación real son varios intercambios y consulta datos,\n" +
    "  así que sale más que esto. La estimación del presupuesto ya lo contempla.\n",
);

#!/usr/bin/env node
// Test de regresión del MOTOR DE CÁLCULO (computeRow) — sin navegador, sin dependencias.
//
// Para qué sirve: congela lo que el motor calcula HOY para miles de combinaciones
// (tipo de penetrante × material × pared/entrepiso × diámetros/dimensiones × anular...)
// y avisa si un cambio posterior altera ALGÚN resultado. Protege la regla
// "jamás cambiar fórmulas sin confirmación de Kevin".
//
// Uso (desde la raíz del repo):
//   node tools/test-regresion.js            -> compara contra tools/regresion-golden.json
//   node tools/test-regresion.js --generar  -> RE-CONGELA los resultados (solo después de un
//                                              cambio de fórmula que Kevin confirmó a propósito)
// Exit code 0 = todo igual, 1 = hay diferencias.
//
// Archivos: tools/regresion-golden.json (hashes de la malla grande + ejemplos legibles).
// Si una diferencia es esperada (ej. se agregó un tipo nuevo), se regenera y se sube el golden
// en el mismo commit que el cambio. Si NO es esperada, hay que revisar el cambio.

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const MODS = ["helpers", "constantes", "data-ul-systems", "calc-engine", "ui-tabla-calculadora"];

const sandbox = { console, setTimeout, clearTimeout };
sandbox.window = sandbox;
sandbox.document = new Proxy({}, { get: () => () => null }); // por si algún módulo toca el DOM al cargar
vm.createContext(sandbox);
for (const m of MODS) {
  const f = path.join(raiz, "src", "modules", m + ".js");
  try { vm.runInContext(fs.readFileSync(f, "utf8"), sandbox, { filename: f }); }
  catch (e) { console.error(`❌ No se pudo cargar ${m}.js en el entorno de prueba: ${e.message}`); process.exit(1); }
}
const run = (code) => vm.runInContext(code, sandbox);
const CONFIG = JSON.parse(JSON.stringify(run("CONFIG")));
const OPTS_L = run("OPTS_L"), OPTS_M = run("OPTS_M"), OPTS_N = run("OPTS_N"), OPTS_P = run("OPTS_P");
const kFromL = run("kFromL"), computeRow = run("computeRow");

// ---------- malla de casos ----------
const DIAMS = [1, 2, 3, 4, 6, 8, 10, 12, 14];
const DIMS = [[20, 20], [60, 40]];
const ESP = [0, 1];
const ANULAR = [0, 1.5];
const CANT = [3];
function* grupos() { // un grupo = (tipo, pared/entrepiso, material de pared, producto); cada uno con todas sus medidas
  for (const L of OPTS_L) for (const M of OPTS_M) for (const N of OPTS_N) for (const P of OPTS_P) {
    const k = kFromL(L);
    const usaDim = /Ducto Rectangular|Viga|Bandeja|Caja|Pasante|Vac/.test(k) || /Viga|Rectangular/.test(L);
    const dims = usaDim ? DIMS : [[null, null]];
    const diams = usaDim && !/Redondo/.test(L) ? [null] : DIAMS;
    const lista = [];
    for (const d of diams) for (const [F, G] of dims) for (const E of ESP) for (const I of ANULAR) for (const C of CANT)
      lista.push({ C, D: d === null ? "" : d, E, F: F === null ? "" : F, G: G === null ? "" : G, H: "", I, J: 0, L, M, N, O: "-", P, A: "", B: "" });
    yield { id: [L, M, N, P].join(" | "), lista };
  }
}
const CAMPOS = ["U", "V", "Y", "Z", "AA", "AB", "AH", "AI", "AJ", "P_VIGA", "cintaNVueltas", "cintaLongitudPen", "collarLongitudPen", "collarLcoltubPen"];
function resultado(caso) {
  let o;
  try { o = computeRow(Object.assign({}, caso, { K: kFromL(caso.L) }), CONFIG); }
  catch (e) { return { error: String(e.message || e) }; }
  const r = {};
  for (const c of CAMPOS) if (o[c] !== undefined) r[c] = typeof o[c] === "number" ? Math.round(o[c] * 1e6) / 1e6 : o[c];
  const q = o.Qtext !== undefined ? o.Qtext : o.Q;
  r.Q = q && typeof q === "object" ? q.text : q;
  return r;
}
function hash4(s) { return hash(s).slice(0, 4); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }

// ---------- ejemplos legibles (valores conocidos, revisables a ojo) ----------
const EJEMPLOS_BASE = [
  { nombre: "PVC combustible 10\" entrepiso concreto, cinta con collar, x28 (2 tiras x 4 vueltas, lado a lado)",
    caso: { C: 28, D: 10, E: 0, F: "", G: "", H: "", I: 1.5, J: 0, L: "Tubería Combustible (PVC, CPVC, PEX, PP-R)", M: "Entrepiso", N: "Concreto", O: "-", P: "Cinta con Collar Metálico CP 648-E/ER" },
    esperado: { cintaNVueltas: "2x4", cintaLongitudPen: 20552, collarLongitudPen: 5420.7664, Q: "C-AJ-2420 (10in o 12in)" } },
];
function ejemplosActuales() { return EJEMPLOS_BASE.map((e) => ({ nombre: e.nombre, caso: e.caso, esperado: e.esperado, actual: resultado(e.caso) })); }

// ---------- ejecución ----------
const rutaGolden = path.join(__dirname, "regresion-golden.json");
const generar = process.argv.includes("--generar");
const huellas = {}; let total = 0, errores = 0;
for (const g of grupos()) {
  let h = "";
  for (const c of g.lista) { const r = resultado(c); if (r.error) errores++; h += hash4(JSON.stringify(r)); total++; }
  huellas[g.id] = h;
}
const ej = ejemplosActuales();

if (generar) {
  fs.writeFileSync(rutaGolden, JSON.stringify({ casos: total, huellas, ejemplos: ej.map(({ nombre, caso, actual }) => ({ nombre, caso, resultado: actual })) }));
  console.log(`✅ Golden regenerado: ${total} casos en ${Object.keys(huellas).length} grupos (${errores} son combinaciones inválidas que lanzan error, no alcanzables desde la UI) -> tools/regresion-golden.json`);
  process.exit(0);
}
if (!fs.existsSync(rutaGolden)) { console.error("❌ Falta tools/regresion-golden.json (correr con --generar la primera vez)."); process.exit(1); }
const gold = JSON.parse(fs.readFileSync(rutaGolden, "utf8"));
let difs = 0, nuevosGrupos = 0; const muestra = [];
for (const g of grupos()) {
  const ref = gold.huellas[g.id];
  if (ref === undefined) { nuevosGrupos++; continue; }
  g.lista.forEach((c, i) => {
    const v = hash4(JSON.stringify(resultado(c)));
    if (ref.slice(i * 4, i * 4 + 4) !== v) { difs++; if (muestra.length < 8) muestra.push({ grupo: g.id, caso: c }); }
  });
}
const actualesIds = new Set(); for (const g of grupos()) actualesIds.add(g.id);
const desaparecidos = Object.keys(gold.huellas).filter((k) => !actualesIds.has(k)).length;
let ejFalla = 0;
for (const e of ej) {
  for (const [k, v] of Object.entries(e.esperado)) {
    const a = e.actual[k]; const ok = typeof v === "number" ? Math.abs(a - v) < 1e-3 : a === v;
    if (!ok) { ejFalla++; console.error(`❌ Ejemplo "${e.nombre}": ${k} esperado ${v}, salió ${a}`); }
  }
}
console.log(`Casos: ${total} | distintos al golden: ${difs} | grupos nuevos (sin golden): ${nuevosGrupos} | grupos desaparecidos: ${desaparecidos}`);
if (difs || ejFalla || desaparecidos) {
  muestra.forEach((m) => console.error("  distinto:", m.grupo, JSON.stringify(m.caso)));
  console.error("\n❌ El motor ya NO calcula igual que cuando se congeló. Si el cambio fue a propósito y Kevin lo confirmó: node tools/test-regresion.js --generar y subir el golden en el mismo commit.");
  process.exit(1);
}
if (nuevosGrupos) console.log("ℹ️  Hay grupos nuevos (ej. un tipo nuevo). No es error, pero conviene regenerar el golden con --generar para protegerlos.");
console.log("✅ Regresión OK — el motor calcula igual que la versión congelada.");

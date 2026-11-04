// ============================================================================
// constantes.js — encapsulado en IIFE (sin exponer todo a window; ver export list abajo)
// ============================================================================
(function () {
// ============================================================================
// constantes.js
// Vocabulario compartido de toda la app: mensajes de error/aviso, tipos de penetrante (TIPO_*), materiales Hilti (MAT_*), y las tablas de familias/fichas asociadas a cada material.
// (Parte del proyecto Calculadora Cortafuego Hilti — ver README.md para el mapa completo de módulos.)
// ============================================================================

const ERR_MATERIAL = "¡ELIJA OTRO MATERIAL HILTI!";
const ERR_JUICIO = "¡SOLICITE JUICIO DE INGENIERÍA!";
const MSG_CAMBIAR_1 = "Cambiar material a Pasta FS ONE MAX";
const MSG_CAMBIAR_2 = "Cambiar material a pasta FS ONE MAX";
const ERR_COMBUSTIBLE_SELLADOR = "CP606 o CFS SIL GG no aplica para tuberías combustibles!";

const TIPO_TUB_METAL = "Tubería Metal";
const TIPO_TUB_METAL_AISL = "Tubería Metal Aislado";
const TIPO_TUB_COBRE_HVAC = "Tubería Cobre Aislado HVAC";
const TIPO_TUB_EMT = "Tubería EMT";
const TIPO_TUB_COMB = "Tubería Combustible (PVC, CPVC, PEX, PP-R)";
const TIPO_TUB_COMB_AISL = "Tubería Combustible Aislada (PVC, CPVC, PEX, PP-R)";
const TIPO_BANDEJA = "Bandeja de Cables";
const TIPO_CABLE_ARMADO = "Cable Armado";
const TIPO_CABLE_REPEN = "Cables en Paso Repenetrable";
const TIPO_CABLE_SUELTOS = "Cables Sueltos";
const TIPO_CAJA_UL = "Caja Electromecánica UL";
const TIPO_DUCTO_RECT = "Ducto Rectangular";
const TIPO_DUCTO_RECT_AISL = "Ducto Rectangular Aislado";
const TIPO_DUCTO_RED = "Ducto Redondo";
const TIPO_DUCTO_RED_AISL = "Ducto Redondo Aislado";
const TIPO_PASANTE_MULT = "Pasante Múltiple";
const TIPO_VACIO = "Vacío";
const TIPO_VIGA_W = "Viga W";
const TIPO_VIGA_CANAL = "Viga Canal";
const TIPO_VIGA_TUBO = "Viga Tubo Rectangular";
const TIPO_VIGA_ANGULAR = "Viga Angular";
const TIPO_VIGA_CONCRETO = "Viga Concreto";
const TIPO_VIGA_TENSOR = "Viga Tensor Redondo";

// Tipos "alias": se calculan y buscan en la tabla UL como otro tipo ya existente.
//  - Viga Angular  -> como Viga Canal (el perímetro se ajusta a 1xF + 1xG en computeRow).
//  - Viga Concreto -> exactamente como Ducto Rectangular.
//  - Viga Tensor Redondo -> exactamente como Tubería Metal.
const TIPO_ALIAS_CALCULO = {};
TIPO_ALIAS_CALCULO[TIPO_VIGA_ANGULAR] = TIPO_VIGA_CANAL;
TIPO_ALIAS_CALCULO[TIPO_VIGA_CONCRETO] = TIPO_DUCTO_RECT;
TIPO_ALIAS_CALCULO[TIPO_VIGA_TENSOR] = TIPO_TUB_METAL;
function tipoBase(L) { return TIPO_ALIAS_CALCULO[L] || L; }

const MAT_PASTA = "Pasta FS ONE MAX";
const MAT_CINTA_CON = "Cinta con Collar Metálico CP 648-E/ER";
const MAT_CINTA_SIN = "Cinta sin Collar Metálico CP 648-E";
const MAT_PUTTY = "Putty Pad CP 617";
const MAT_ESPUMA = "Espuma CP 620";
const MAT_ALMOHADILLA = "Almohadilla CFS-BL";
const MAT_MANGA = 'Manga CP 653 4"';
const MAT_MSL_M = 'Paso de cables MSL M 3"x4"';
const MAT_MSL_L = 'Paso de cables MSL L 6"x4"';
const MAT_COLLARIN = "Collarín CP 643N/644";
const MAT_MORTERO = "Mortero CP 637";
const MAT_CP606 = "Sellador CP 606";
const MAT_CFS_SIL_GG = "Sellador CFS SIL GG";

// Familias de materiales usadas para verificar que el "Producto Hilti" mostrado en el
// Resumen refleje lo que realmente se seleccionó en cada fila — no solo el texto
// genérico de NORMA_APLICACION. Esto es necesario porque varios materiales distintos
// (Pasta, Sellador CP606, CFS SIL GG, Espuma, Almohadilla, Mortero...) pueden compartir
// el mismo código de norma en Bandeja de Cables / Pasante Múltiple.
const FAMILIA_POR_MATERIAL = {
  [MAT_PASTA]: /pasta|fs one max/i,
  [MAT_CP606]: /cp\s*606/i,
  [MAT_CFS_SIL_GG]: /sil\s*gg/i,
  [MAT_ESPUMA]: /espuma|cp\s*620/i,
  [MAT_ALMOHADILLA]: /almohadilla|cfs-bl/i,
  [MAT_MORTERO]: /mortero/i,
  // Más específico: "Collarín" (con tilde) para no confundir con
  // "Collar de retención CP 648-ER" que aparece en sistemas de cinta.
  [MAT_COLLARIN]: /collar[ií]n\s+cp\s*64[34]/i,
  [MAT_PUTTY]: /putty/i,
};
// Alias entre el nombre interno del material y la clave real en PRODUCTO_FICHAS
// (algunos difieren levemente en redacción).
const FICHA_ALIAS = {
  [MAT_CFS_SIL_GG]: "Sellador CFS-S SIL GG",
  [MAT_COLLARIN]: "Collarín CP643N o CP444",
};

// --- Exports usados por otros módulos ---
window.ERR_MATERIAL = ERR_MATERIAL;
window.ERR_JUICIO = ERR_JUICIO;
window.MSG_CAMBIAR_1 = MSG_CAMBIAR_1;
window.MSG_CAMBIAR_2 = MSG_CAMBIAR_2;
window.ERR_COMBUSTIBLE_SELLADOR = ERR_COMBUSTIBLE_SELLADOR;
window.TIPO_TUB_METAL = TIPO_TUB_METAL;
window.TIPO_TUB_COBRE_HVAC = TIPO_TUB_COBRE_HVAC;
window.TIPO_TUB_COMB = TIPO_TUB_COMB;
window.TIPO_TUB_COMB_AISL = TIPO_TUB_COMB_AISL;
window.TIPO_BANDEJA = TIPO_BANDEJA;
window.TIPO_CABLE_REPEN = TIPO_CABLE_REPEN;
window.TIPO_CAJA_UL = TIPO_CAJA_UL;
window.TIPO_DUCTO_RECT = TIPO_DUCTO_RECT;
window.TIPO_DUCTO_RECT_AISL = TIPO_DUCTO_RECT_AISL;
window.TIPO_DUCTO_RED = TIPO_DUCTO_RED;
window.TIPO_DUCTO_RED_AISL = TIPO_DUCTO_RED_AISL;
window.TIPO_PASANTE_MULT = TIPO_PASANTE_MULT;
window.TIPO_VACIO = TIPO_VACIO;
window.TIPO_VIGA_W = TIPO_VIGA_W;
window.TIPO_VIGA_CANAL = TIPO_VIGA_CANAL;
window.TIPO_VIGA_TUBO = TIPO_VIGA_TUBO;
window.TIPO_VIGA_ANGULAR = TIPO_VIGA_ANGULAR;
window.TIPO_VIGA_CONCRETO = TIPO_VIGA_CONCRETO;
window.TIPO_VIGA_TENSOR = TIPO_VIGA_TENSOR;
window.tipoBase = tipoBase;
window.MAT_PASTA = MAT_PASTA;
window.MAT_CINTA_CON = MAT_CINTA_CON;
window.MAT_CINTA_SIN = MAT_CINTA_SIN;
window.MAT_PUTTY = MAT_PUTTY;
window.MAT_ESPUMA = MAT_ESPUMA;
window.MAT_ALMOHADILLA = MAT_ALMOHADILLA;
window.MAT_MANGA = MAT_MANGA;
window.MAT_MSL_M = MAT_MSL_M;
window.MAT_MSL_L = MAT_MSL_L;
window.MAT_COLLARIN = MAT_COLLARIN;
window.MAT_MORTERO = MAT_MORTERO;
window.MAT_CP606 = MAT_CP606;
window.MAT_CFS_SIL_GG = MAT_CFS_SIL_GG;
window.FAMILIA_POR_MATERIAL = FAMILIA_POR_MATERIAL;
window.FICHA_ALIAS = FICHA_ALIAS;
})();

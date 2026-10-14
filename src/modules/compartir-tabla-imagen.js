// ============================================================================
// compartir-tabla-imagen.js — encapsulado en IIFE (sin exponer todo a window; ver export list abajo)
// ============================================================================
(function () {
// Comparte la tabla de "Cuantificación de Materiales Hilti" de dos formas:
//  1) Imagen JPG dibujada en un <canvas> (sin librerías externas), con
//     navigator.share o descarga como respaldo.
//  2) COPIAR como tabla con formato (HTML + texto plano) para pegar en un
//     correo, Word o Excel, donde el texto queda seleccionable/copiable.
// Las dos respetan la vista activa: tabla completa, o varias tablas si se
// dividió por pared/losa/juntas y/o por zonas.

function medirTextoCanvas(ctx, texto, maxWidth) {
  // Envuelve texto en líneas que no excedan maxWidth (wrapping simple por palabras)
  const palabras = String(texto).split(" ");
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? actual + " " + palabra : palabra;
    if (ctx.measureText(prueba).width > maxWidth && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Lee de la pantalla las tablas de materiales que se ven ahora.
// Devuelve [{ titulo, headers, filas }]. Vista completa → una sección sin título.
// Vista dividida/por zonas → una sección por cada <table data-titulo>.
// Se omite la última columna (acciones) y las filas de "sin materiales".
function obtenerSeccionesTablaMateriales() {
  const agrupada = document.getElementById("materiales-vista-agrupada");
  const usaAgrupada = !!(agrupada && agrupada.style.display !== "none" && agrupada.querySelector("table[data-titulo]"));
  const tablas = usaAgrupada
    ? Array.from(agrupada.querySelectorAll("table[data-titulo]"))
    : [document.getElementById("tabla-materiales")];
  const secciones = [];
  tablas.forEach((tabla) => {
    if (!tabla) return;
    const theadRow = tabla.querySelector("thead tr");
    if (!theadRow) return;
    const headers = Array.from(theadRow.querySelectorAll("th")).slice(0, -1).map(th => th.textContent.trim());
    const filas = Array.from(tabla.querySelectorAll("tbody tr"))
      .filter(tr => !tr.querySelector("td.empty-state"))
      .map(tr => Array.from(tr.querySelectorAll("td")).slice(0, -1).map(td => td.textContent.trim()))
      .filter(fila => fila.length > 0 && fila.some(c => c));
    if (filas.length === 0) return;
    secciones.push({ titulo: usaAgrupada ? (tabla.getAttribute("data-titulo") || "") : "", headers, filas });
  });
  return secciones;
}

function nombreProyectoActual() {
  return (typeof PROJECT_INFO !== "undefined" && PROJECT_INFO.nombre) ? PROJECT_INFO.nombre : "";
}

function generarImagenTablaMateriales() {
  const secciones = obtenerSeccionesTablaMateriales();
  if (secciones.length === 0) return null;

  // Colores según el tema activo
  const esOscuro = document.documentElement.getAttribute("data-theme") === "dark" ||
    (document.documentElement.getAttribute("data-theme") !== "light" &&
     window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const colores = esOscuro
    ? { fondo: "#1e1e21", filaAlt: "#28282c", header: "#1a1a1a", texto: "#ececee", textoHeader: "#ffffff", borde: "#333338" }
    : { fondo: "#ffffff", filaAlt: "#f8f8fa", header: "#1a1a1a", texto: "#111111", textoHeader: "#ffffff", borde: "#d1d1d6" };

  // Configuración de columnas: [ancho relativo, alineación]
  const encabezadosBase = secciones[0].headers;
  const cols = [
    { label: encabezadosBase[0] || "Código", w: 0.16, align: "left" },
    { label: encabezadosBase[1] || "Cantidad", w: 0.10, align: "center" },
    { label: encabezadosBase[2] || "Producto", w: 0.34, align: "left" },
    { label: encabezadosBase[3] || "Presentación", w: 0.20, align: "left" },
    { label: encabezadosBase[4] || "Tipo", w: 0.20, align: "left" },
  ];

  const anchoTotal = 1000;
  const padCelda = 14;
  const altoFila = 40;
  const altoHeader = 46;
  const altoTitulo = 70;
  const altoPie = 46;
  const altoTituloSeccion = 38;
  const sepSecciones = 18;

  // Canvas temporal para medir texto y calcular alto real (por wrapping)
  const canvasMedida = document.createElement("canvas");
  const ctxMedida = canvasMedida.getContext("2d");
  ctxMedida.font = "14px -apple-system, Arial, sans-serif";

  const anchosCol = cols.map(c => Math.floor(anchoTotal * c.w));
  const seccionesConLineas = secciones.map(sec => {
    const filasConLineas = sec.filas.map(fila => {
      let maxLineas = 1;
      const lineasFila = fila.map((valor, i) => {
        const maxW = (anchosCol[i] || 100) - padCelda * 2;
        const lineas = medirTextoCanvas(ctxMedida, valor, maxW);
        maxLineas = Math.max(maxLineas, lineas.length);
        return lineas;
      });
      return { lineasFila, maxLineas };
    });
    const altoFilas = filasConLineas.reduce((acc, f) => acc + Math.max(altoFila, f.maxLineas * 20 + 16), 0);
    const altoSeccion = (sec.titulo ? altoTituloSeccion : 0) + altoHeader + altoFilas;
    return { titulo: sec.titulo, filasConLineas, altoSeccion };
  });

  const altoSecciones = seccionesConLineas.reduce((acc, s) => acc + s.altoSeccion, 0) + sepSecciones * (seccionesConLineas.length - 1);
  const altoTotal = altoTitulo + altoSecciones + altoPie;

  const escala = 2; // para nitidez (retina)
  const canvas = document.createElement("canvas");
  canvas.width = anchoTotal * escala;
  canvas.height = altoTotal * escala;
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);

  // Fondo general
  ctx.fillStyle = colores.fondo;
  ctx.fillRect(0, 0, anchoTotal, altoTotal);

  // Título
  const nombreProyecto = nombreProyectoActual();
  ctx.fillStyle = colores.texto;
  ctx.font = "bold 22px -apple-system, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("Cuantificación de Materiales Hilti", padCelda, 30);
  if (nombreProyecto) {
    ctx.font = "14px -apple-system, Arial, sans-serif";
    ctx.fillStyle = esOscuro ? "#b6b6bc" : "#555558";
    ctx.fillText(nombreProyecto, padCelda, 54);
  }

  let y = altoTitulo;
  seccionesConLineas.forEach((sec, idxSec) => {
    if (idxSec > 0) y += sepSecciones;

    // Título de la sección (solo en vista dividida / por zonas)
    if (sec.titulo) {
      ctx.textAlign = "left";
      ctx.font = "bold 16px -apple-system, Arial, sans-serif";
      ctx.fillStyle = colores.texto;
      ctx.fillText(sec.titulo, padCelda, y + altoTituloSeccion / 2 - 2);
      y += altoTituloSeccion;
    }

    // Header de tabla
    ctx.fillStyle = colores.header;
    ctx.fillRect(0, y, anchoTotal, altoHeader);
    ctx.font = "bold 14px -apple-system, Arial, sans-serif";
    ctx.fillStyle = colores.textoHeader;
    let x = 0;
    cols.forEach((col, i) => {
      const w = anchosCol[i];
      const tx = col.align === "center" ? x + w / 2 : x + padCelda;
      ctx.textAlign = col.align === "center" ? "center" : "left";
      ctx.fillText(col.label, tx, y + altoHeader / 2);
      x += w;
    });
    y += altoHeader;

    // Filas
    ctx.font = "13px -apple-system, Arial, sans-serif";
    sec.filasConLineas.forEach((f, idxFila) => {
      const altoEstaFila = Math.max(altoFila, f.maxLineas * 20 + 16);
      if (idxFila % 2 === 1) {
        ctx.fillStyle = colores.filaAlt;
        ctx.fillRect(0, y, anchoTotal, altoEstaFila);
      }
      ctx.fillStyle = colores.texto;
      let cx = 0;
      f.lineasFila.forEach((lineas, i) => {
        const w = anchosCol[i];
        const tx = cols[i].align === "center" ? cx + w / 2 : cx + padCelda;
        ctx.textAlign = cols[i].align === "center" ? "center" : "left";
        const offsetY = y + altoEstaFila / 2 - ((lineas.length - 1) * 10);
        lineas.forEach((linea, li) => {
          ctx.fillText(linea, tx, offsetY + li * 20);
        });
        cx += w;
      });
      // Línea separadora
      ctx.strokeStyle = colores.borde;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + altoEstaFila);
      ctx.lineTo(anchoTotal, y + altoEstaFila);
      ctx.stroke();
      y += altoEstaFila;
    });
  });

  // Pie
  ctx.textAlign = "left";
  ctx.font = "11px -apple-system, Arial, sans-serif";
  ctx.fillStyle = "#8a8a90";
  const fecha = new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });
  ctx.fillText(`Generado el ${fecha} · Firestop Suite · Superba`, padCelda, y + altoPie / 2);

  return canvas;
}

async function compartirTablaMaterialesImagen() {
  const canvas = generarImagenTablaMateriales();
  if (!canvas) {
    mostrarToast("No hay materiales en la tabla para compartir.", "error");
    return;
  }

  const nombre = (typeof PROJECT_INFO !== "undefined" && PROJECT_INFO.nombre
    ? PROJECT_INFO.nombre : "proyecto").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "proyecto";
  const archivo = `${nombre}-cuantificacion-materiales.jpg`;

  canvas.toBlob(async (blob) => {
    if (!blob) {
      mostrarToast("No se pudo generar la imagen.", "error");
      return;
    }
    const file = new File([blob], archivo, { type: "image/jpeg" });

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Cuantificación de Materiales",
          text: "Cuantificación de materiales Hilti para el proyecto.",
        });
        mostrarToast("Imagen compartida.");
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      // si falla, seguimos con la descarga de respaldo
    }

    // Respaldo: descargar directo
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    mostrarToast("Este navegador no permite compartir directo — se descargó la imagen.");
  }, "image/jpeg", 0.92);
}

// ---------------------------------------------------------------------------
// COPIAR como tabla con formato
// ---------------------------------------------------------------------------
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// HTML con estilos EN LÍNEA (Word/Outlook/Gmail ignoran las hojas de estilo
// de la app) y siempre en colores claros, sin importar el tema de la app.
function construirHtmlTablaMateriales(secciones) {
  const fam = "font-family:Arial,Helvetica,sans-serif;";
  const nombreProyecto = nombreProyectoActual();
  const fecha = new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });
  let html = `<div style="${fam}color:#111111;">`;
  html += `<p style="${fam}font-size:16px;font-weight:bold;margin:0 0 2px 0;">Cuantificación de Materiales Hilti</p>`;
  if (nombreProyecto) html += `<p style="${fam}font-size:13px;color:#555558;margin:0 0 10px 0;">${escHtml(nombreProyecto)}</p>`;
  secciones.forEach((sec, idx) => {
    if (sec.titulo) html += `<p style="${fam}font-size:14px;font-weight:bold;margin:${idx === 0 ? "6" : "16"}px 0 6px 0;">${escHtml(sec.titulo)}</p>`;
    html += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #bdbdc2;${fam}font-size:13px;">`;
    html += "<thead><tr>";
    sec.headers.forEach((h, i) => {
      const align = i === 1 ? "center" : "left";
      html += `<th style="background-color:#1a1a1a;color:#ffffff;border:1px solid #bdbdc2;text-align:${align};padding:6px 10px;">${escHtml(h)}</th>`;
    });
    html += "</tr></thead><tbody>";
    sec.filas.forEach((fila, r) => {
      const bg = r % 2 === 1 ? "#f3f3f6" : "#ffffff";
      html += "<tr>";
      fila.forEach((valor, i) => {
        const align = i === 1 ? "center" : "left";
        html += `<td style="background-color:${bg};border:1px solid #bdbdc2;text-align:${align};padding:6px 10px;">${escHtml(valor)}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
  });
  html += `<p style="${fam}font-size:11px;color:#8a8a90;margin:10px 0 0 0;">Generado el ${escHtml(fecha)} · Firestop Suite · Superba</p>`;
  html += "</div>";
  return html;
}

// Texto plano con tabuladores: pega bien en Excel y en editores de texto.
function construirTextoTablaMateriales(secciones) {
  const nombreProyecto = nombreProyectoActual();
  const partes = ["Cuantificación de Materiales Hilti"];
  if (nombreProyecto) partes.push(nombreProyecto);
  secciones.forEach((sec) => {
    partes.push("");
    if (sec.titulo) partes.push(sec.titulo);
    partes.push(sec.headers.join("\t"));
    sec.filas.forEach(f => partes.push(f.join("\t")));
  });
  return partes.join("\n");
}

// Respaldo para navegadores sin ClipboardItem (iOS viejo, Firefox): se mete el
// HTML en un div fuera de pantalla, se selecciona y se usa execCommand("copy").
function copiarHtmlConSeleccion(html) {
  const cont = document.createElement("div");
  cont.setAttribute("contenteditable", "true");
  cont.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;overflow:hidden;user-select:text;-webkit-user-select:text;";
  cont.innerHTML = html;
  document.body.appendChild(cont);
  const sel = window.getSelection();
  const rango = document.createRange();
  rango.selectNodeContents(cont);
  sel.removeAllRanges();
  sel.addRange(rango);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  sel.removeAllRanges();
  cont.remove();
  return ok;
}

async function copiarTablaMateriales() {
  const secciones = obtenerSeccionesTablaMateriales();
  if (secciones.length === 0) {
    mostrarToast("No hay materiales en la tabla para copiar.", "error");
    return;
  }
  const html = construirHtmlTablaMateriales(secciones);
  const texto = construirTextoTablaMateriales(secciones);
  const mensajeOk = secciones.length > 1 ? "Tablas copiadas. Pegalas en el correo o en Word." : "Tabla copiada. Pegala en el correo o en Word.";

  try {
    if (navigator.clipboard && navigator.clipboard.write && typeof window.ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([texto], { type: "text/plain" }),
        }),
      ]);
      mostrarToast(mensajeOk);
      return;
    }
  } catch (err) {
    // sigue al respaldo
  }

  if (copiarHtmlConSeleccion(html)) {
    mostrarToast(mensajeOk);
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      mostrarToast("Se copió como texto (este navegador no permite copiar con formato).");
      return;
    }
  } catch (err) { /* nada */ }
  mostrarToast("No se pudo copiar. Probá con 'Compartir imagen'.", "error");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-compartir-tabla-materiales");
  if (btn) btn.addEventListener("click", compartirTablaMaterialesImagen);
  const btnCopiar = document.getElementById("btn-copiar-tabla-materiales");
  if (btnCopiar) btnCopiar.addEventListener("click", copiarTablaMateriales);
});

// --- Exports usados por otros módulos ---
// (solo para pruebas / uso interno)
window.obtenerSeccionesTablaMateriales = obtenerSeccionesTablaMateriales;

})();

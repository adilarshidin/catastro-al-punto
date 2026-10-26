// Proxy mínimo hacia los servicios web OFICIALES de la Dirección General del Catastro.
// Solo reenvía consultas de una lista cerrada, valida parámetros y cachea 24 h en el CDN.
// No hace scraping: usa los servicios OVC (SOAP/GET) y el WFS INSPIRE públicos.

const OVC = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/";
const WFS = "https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx";

const num = (v, min, max) => {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) throw new Error("Coordenada fuera de España");
  return n.toFixed(7);
};
const rc = (v, len) => {
  const s = String(v ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (len && s.length < len) throw new Error("Referencia catastral incompleta");
  if (!/^[0-9A-Z]{14}([0-9A-Z]{6})?$/.test(s)) throw new Error("Referencia catastral no válida");
  return len ? s.slice(0, len) : s;
};
const coords = (q) => ({
  SRS: "EPSG:4326",
  Coordenada_X: num(q.lng, -19, 5),
  Coordenada_Y: num(q.lat, 27, 44.5),
});

const OPS = {
  // Coordenadas -> referencia catastral de la parcela en ese punto
  rccoor: { url: OVC + "OVCCoordenadas.asmx/Consulta_RCCOOR", params: coords },
  // Coordenadas -> parcelas en un cuadrado de 50 m (para cuando el pin cae mal)
  rccoordist: { url: OVC + "OVCCoordenadas.asmx/Consulta_RCCOOR_Distancia", params: coords },
  // Referencia catastral -> coordenadas
  cpmrc: {
    url: OVC + "OVCCoordenadas.asmx/Consulta_CPMRC",
    params: (q) => ({ Provincia: "", Municipio: "", SRS: "EPSG:4326", RC: rc(q.rc, 14) }),
  },
  // Referencia catastral (14 o 20) -> inmuebles (escalera, planta, puerta, uso, superficie)
  dnprc: {
    url: OVC + "OVCCallejero.asmx/Consulta_DNPRC",
    params: (q) => ({ Provincia: "", Municipio: "", RC: rc(q.rc) }),
  },
  // Polígono de la parcela (INSPIRE WFS)
  parcel: {
    url: WFS,
    params: (q) => ({
      service: "wfs",
      version: "2",
      request: "getfeature",
      STOREDQUERIE_ID: "GetParcel",
      refcat: rc(q.rc, 14),
      srsname: "EPSG:4326",
    }),
  },
};

// Enlace corto de Google Maps (maps.app.goo.gl) -> enlace largo, que sí lleva coordenadas o el nombre del lugar.
// Solo sigue redirecciones de los acortadores; nunca descarga otras páginas.
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const isShort = (u) => u.protocol === "https:" && SHORT_HOSTS.has(u.hostname) && (u.hostname !== "goo.gl" || u.pathname.startsWith("/maps"));
async function expandMapsLink(raw) {
  let u;
  try { u = new URL(String(raw ?? "")); } catch { throw new Error("Enlace no válido"); }
  if (!isShort(u)) throw new Error("Solo se aceptan enlaces cortos de Google Maps");
  for (let i = 0; i < 5 && isShort(u); i++) {
    const r = await fetch(u, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CatastroAlPunto/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const loc = r.headers.get("location");
    if (r.status < 300 || r.status > 399 || !loc) throw new Error("El enlace de Google Maps no existe o ha caducado");
    u = new URL(loc, u);
    // Fuera de la UE no pasa, pero por si Google pide antes el consentimiento de cookies.
    if (u.hostname === "consent.google.com" && u.searchParams.get("continue")) u = new URL(u.searchParams.get("continue"));
  }
  if (isShort(u)) throw new Error("El enlace de Google Maps da demasiadas vueltas");
  return u.href;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.query.op === "maps") {
    try {
      const url = await expandMapsLink(req.query.url);
      res.setHeader("Cache-Control", "public, s-maxage=86400");
      return res.status(200).json({ url });
    } catch (e) {
      const ours = !["TimeoutError", "TypeError", "AbortError"].includes(e.name);
      return res.status(ours ? 400 : 504).json({ error: ours ? e.message : "No se pudo abrir el enlace de Google Maps" });
    }
  }
  const op = OPS[req.query.op];
  if (!op) return res.status(400).json({ error: "Operación no permitida" });

  let target;
  try {
    target = op.url + "?" + new URLSearchParams(op.params(req.query)).toString();
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  try {
    const r = await fetch(target, {
      headers: { "User-Agent": "CatastroAlPunto/1.0 (+uso profesional)" },
      signal: AbortSignal.timeout(12000),
    });
    const buf = await r.arrayBuffer();
    const ct = r.headers.get("content-type") || "";
    const head = new TextDecoder("latin1").decode(buf.slice(0, 200));
    const enc =
      (ct.match(/charset=([\w-]+)/i) || head.match(/encoding="([\w-]+)"/i) || [])[1] || "utf-8";
    let text;
    try { text = new TextDecoder(enc).decode(buf); } catch { text = new TextDecoder().decode(buf); }

    if (!r.ok) return res.status(502).json({ error: `El Catastro respondió ${r.status}` });
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(text);
  } catch (e) {
    const slow = e.name === "TimeoutError";
    return res
      .status(504)
      .json({ error: slow ? "El Catastro tardó demasiado en responder" : "No se pudo contactar con el Catastro" });
  }
}

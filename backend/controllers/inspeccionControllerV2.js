// backend/controllers/inspeccionControllerV2.js
const { pool } = require('../config/db');
const { generarinforme } = require('../utils/generarpdf');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatDateDDMMYY(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

async function getCommodityByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  const r = await pool.query(
    'SELECT id, code, name, active FROM commodities WHERE code = $1 LIMIT 1',
    [c]
  );
  return r.rows[0] || null;
}

// Para guardar en DB (FS friendly): "uploads/xxx.jpg"
function fileToDbPath(filePath) {
  const filename = path.basename(filePath);
  return `uploads/${filename}`;
}

// Para devolver al frontend como URL pública: "/uploads/xxx.jpg"
function dbPathToPublicUrl(dbPath) {
  if (!dbPath) return null;
  return dbPath.startsWith('/') ? dbPath : `/${dbPath}`;
}

function calcularNotasAutomaticasCereza(d) {
  const pit_p = parseFloat(d.pitting_punhead) || 0;
  const pit_a = parseFloat(d.pitting_adhesion) || 0;
  const vir = parseFloat(d.virosis) || 0;
  const def = parseFloat(d.deforme) || 0;

  const suma_total = pit_p + pit_a + vir + def;

  let nota_gen = 'Nota 4';
  if (suma_total > 12 || vir > 5) nota_gen = 'Nota 1';
  else if (suma_total > 8) nota_gen = 'Nota 2';
  else if (suma_total > 4) nota_gen = 'Nota 3';

  return {
    general: nota_gen,
    condition: (pit_p + pit_a + vir) > 8 ? 'Nota 2' : 'Nota 4',
    quality: def > 5 ? 'Nota 2' : 'Nota 4',
    appearance: d.apariencia || (suma_total > 10 ? 'Nota 2' : 'Nota 4'),
    color_mix: d.mezcla_color || 'Nota 4'
  };
}

/**
 * Construye metrics a partir del body:
 * - Si viene body.metrics (objeto o JSON string) => lo usa.
 * - Si vienen body.template_id + body.template_version + body.values => arma {template_id, template_version, values}
 * - Si commodity es CHERRY (legado) => arma defects/scores.
 */
function buildMetricsFromBody(body, commodityCode) {
  const code = String(commodityCode || '').toUpperCase();

  // 1) metrics directo
  if (body.metrics) {
    try {
      const m = typeof body.metrics === 'string' ? JSON.parse(body.metrics) : body.metrics;
      if (m && typeof m === 'object') return m;
    } catch {}
  }

  // 2) template_id/template_version/values
  if (body.template_id && body.template_version && body.values) {
    try {
      const values = typeof body.values === 'string' ? JSON.parse(body.values) : body.values;
      return {
        template_id: Number(body.template_id),
        template_version: Number(body.template_version),
        values: values && typeof values === 'object' ? values : {}
      };
    } catch {
      return {
        template_id: Number(body.template_id),
        template_version: Number(body.template_version),
        values: {}
      };
    }
  }

  // 3) legado CHERRY
  if (code === 'CHERRY') {
    const scores = calcularNotasAutomaticasCereza(body);
    return {
      scores,
      defects: {
        pitting_punhead: toNumberOrNull(body.pitting_punhead) ?? 0,
        pitting_adhesion: toNumberOrNull(body.pitting_adhesion) ?? 0,
        virosis: toNumberOrNull(body.virosis) ?? 0,
        deforme: toNumberOrNull(body.deforme) ?? 0
      },
      raw: {
        nro_frutos: body.nro_frutos ?? null,
        nro_trypack: body.nro_trypack ?? null
      }
    };
  }

  // 4) fallback
  return {};
}

function flattenForPdf(ins) {
  const m = ins.metrics || {};
  const values = m.values || {}; // berries

  return {
    productor: ins.producer ?? null,
    lote: ins.lot ?? null,
    variedad: ins.variety ?? null,
    calibre: ins.caliber ?? null,
    cod_embalaje: ins.packaging_code ?? null,
    embalaje: ins.packaging_type ?? null,
    fecha_embalaje: formatDateDDMMYY(ins.packaging_date),

    peso_neto: ins.net_weight ?? null,
    ss_promedio: ins.brix_avg ?? null,
    t_agua_diping: ins.temp_water ?? null,
    t_ambiente: ins.temp_ambient ?? null,
    t_pulpa_embalada: ins.temp_pulp ?? null,
    observaciones: ins.notes ?? null,

    // CHERRY legado (por si existiera)
    nro_frutos: m?.raw?.nro_frutos ?? null,
    nro_trypack: m?.raw?.nro_trypack ?? null,
    pitting_punhead: m?.defects?.pitting_punhead ?? 0,
    pitting_adhesion: m?.defects?.pitting_adhesion ?? 0,
    virosis: m?.defects?.virosis ?? 0,
    deforme: m?.defects?.deforme ?? 0,
    nota_general: m?.scores?.general ?? null,
    nota_condicion: m?.scores?.condition ?? null,
    nota_calidad: m?.scores?.quality ?? null,
    apariencia: m?.scores?.appearance ?? null,
    mezcla_color: m?.scores?.color_mix ?? null,

    // ✅ Importante para berries
    metrics_values: values,

    fotos: ins.fotos || []
  };
}

async function sha256File(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function pickUploadedFiles(req) {
  const filesFotos = (req.files && req.files.fotos) ? req.files.fotos : [];
  const filesImagenes = (req.files && req.files.imagenes) ? req.files.imagenes : [];
  return [...filesFotos, ...filesImagenes];
}

// -------------------------
// POST /api/inspecciones
// -------------------------
exports.crearInspeccionV2 = async (req, res) => {
  try {
    const d = req.body || {};

    const commodityCode = String(d.commodity || d.fruta || d.commodity_code || '').trim().toUpperCase();
    if (!commodityCode) {
      return res.status(400).json({
        success: false,
        msg: 'Falta commodity. Ej: STRAWBERRY, RASPBERRY, BLACKBERRY, BLUEBERRY, RED_CURRANTS'
      });
    }

    // ✅ Bloqueo CHERRY
    if (commodityCode === 'CHERRY') {
      return res.status(400).json({ success: false, msg: 'CHERRY está deshabilitado. Usa berries del manual.' });
    }

    const commodity = await getCommodityByCode(commodityCode);
    if (!commodity || commodity.active !== true) {
      return res.status(400).json({ success: false, msg: 'Commodity inválido o inactivo' });
    }

    const uploadedFiles = pickUploadedFiles(req);
    const photoDbPaths = uploadedFiles.map(f => fileToDbPath(f.path));

    const metrics = buildMetricsFromBody(d, commodityCode);

    const insertInspection = `
      INSERT INTO inspections (
        commodity_id, created_by_user_id,
        producer, lot, variety, caliber,
        packaging_code, packaging_type, packaging_date,
        net_weight, brix_avg,
        temp_water, temp_ambient, temp_pulp,
        notes, metrics
      )
      VALUES (
        $1,$2,
        $3,$4,$5,$6,
        $7,$8,$9,
        $10,$11,
        $12,$13,$14,
        $15,$16
      )
      RETURNING *
    `;

    const values = [
      commodity.id,
      req.user.id,
      d.productor || null,
      d.lote || null,
      d.variedad || null,
      d.calibre || null,
      d.cod_embalaje || null,
      d.embalaje || null,
      d.fecha_embalaje ? new Date(d.fecha_embalaje) : null,
      toNumberOrNull(d.peso_neto),
      toNumberOrNull(d.ss_promedio),
      toNumberOrNull(d.t_agua_diping),
      toNumberOrNull(d.t_ambiente),
      toNumberOrNull(d.t_pulpa_embalada),
      d.observaciones || null,
      metrics
    ];

    const created = await pool.query(insertInspection, values);
    const inspection = created.rows[0];

    // fotos
    if (photoDbPaths.length > 0) {
      for (const dbPath of photoDbPaths) {
        await pool.query(
          `INSERT INTO inspection_photos (inspection_id, url, label)
           VALUES ($1,$2,'general')`,
          [inspection.id, dbPath]
        );
      }
    }

    // PDF pendiente
    await pool.query(
      `INSERT INTO inspection_pdfs (inspection_id, status)
       VALUES ($1, 'PENDING')
       ON CONFLICT (inspection_id) DO NOTHING`,
      [inspection.id]
    );

    return res.json({
      success: true,
      inspection_id: inspection.id,
      pdf_status: 'PENDING',
      fotos: photoDbPaths.map(dbPathToPublicUrl)
    });
  } catch (error) {
    console.error('crearInspeccionV2:', error);
    return res.status(500).json({ success: false, msg: 'Error al crear inspección', detalle: error.message });
  }
};

// -------------------------
// GET /api/inspecciones/historial (admin)
// -------------------------
exports.obtenerHistorialV2 = async (req, res) => {
  try {
    const { commodity, date_from, date_to, producer, lot, pdf_status } = req.query;

    const where = [];
    const params = [];
    let i = 1;

    if (commodity) {
      where.push(`c.code = $${i++}`);
      params.push(String(commodity).toUpperCase());
    }
    if (producer) {
      where.push(`i.producer ILIKE $${i++}`);
      params.push(`%${producer}%`);
    }
    if (lot) {
      where.push(`i.lot ILIKE $${i++}`);
      params.push(`%${lot}%`);
    }
    if (date_from) {
      where.push(`i.created_at >= $${i++}`);
      params.push(new Date(date_from));
    }
    if (date_to) {
      const dt = new Date(date_to);
      dt.setHours(23, 59, 59, 999);
      where.push(`i.created_at <= $${i++}`);
      params.push(dt);
    }
    if (pdf_status) {
      where.push(`p.status = $${i++}`);
      params.push(String(pdf_status).toUpperCase());
    }

    const sql = `
      SELECT
        i.id,
        i.created_at,
        i.producer,
        i.lot,
        i.variety,
        i.caliber,
        i.metrics,
        c.code AS commodity_code,
        c.name AS commodity_name,
        COALESCE(p.status, 'PENDING') AS pdf_status,
        p.pdf_url
      FROM inspections i
      JOIN commodities c ON c.id = i.commodity_id
      LEFT JOIN inspection_pdfs p ON p.inspection_id = i.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY i.created_at DESC
      LIMIT 500
    `;

    const r = await pool.query(sql, params);
    return res.json(r.rows);
  } catch (error) {
    console.error('obtenerHistorialV2:', error);
    return res.status(500).json({ msg: 'Error al obtener historial', detalle: error.message });
  }
};

// -------------------------
// GET /api/inspecciones/:id (admin)
// -------------------------
exports.obtenerDetalleV2 = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const inspQ = `
      SELECT
        i.*,
        c.code AS commodity_code,
        c.name AS commodity_name,
        COALESCE(p.status, 'PENDING') AS pdf_status,
        p.pdf_url,
        p.updated_at AS pdf_updated_at
      FROM inspections i
      JOIN commodities c ON c.id = i.commodity_id
      LEFT JOIN inspection_pdfs p ON p.inspection_id = i.id
      WHERE i.id = $1
    `;
    const inspR = await pool.query(inspQ, [id]);
    if (inspR.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const photosR = await pool.query(
      'SELECT id, url, label, created_at FROM inspection_photos WHERE inspection_id = $1 ORDER BY id ASC',
      [id]
    );

    return res.json({
      ...inspR.rows[0],
      fotos: photosR.rows.map(p => ({ ...p, url_public: dbPathToPublicUrl(p.url) }))
    });
  } catch (error) {
    console.error('obtenerDetalleV2:', error);
    return res.status(500).json({ msg: 'Error al obtener inspección', detalle: error.message });
  }
};

// -------------------------
// PUT /api/inspecciones/:id (admin) => edita cabecera y deja PDF PENDING
// -------------------------
exports.actualizarInspeccionAdminV2 = async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body || {};
    if (!/^\d+$/.test(String(id))) return res.status(400).json({ msg: 'ID inválido' });

    const actualR = await pool.query(
      `SELECT i.*, c.code AS commodity_code
       FROM inspections i JOIN commodities c ON c.id=i.commodity_id
       WHERE i.id=$1`,
      [id]
    );
    if (actualR.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const current = actualR.rows[0];

    const commodityCode = String(d.commodity || d.fruta || d.commodity_code || current.commodity_code || '').toUpperCase();
    if (commodityCode === 'CHERRY') {
      return res.status(400).json({ msg: 'CHERRY está deshabilitado' });
    }

    // mantenemos metrics, salvo que venga en body (no recomendado aquí)
    const newMetrics = d.metrics ? buildMetricsFromBody(d, commodityCode) : current.metrics;

    const updateQ = `
      UPDATE inspections SET
        producer = $1,
        lot = $2,
        variety = $3,
        caliber = $4,
        packaging_code = $5,
        packaging_type = $6,
        packaging_date = $7,
        net_weight = $8,
        brix_avg = $9,
        temp_water = $10,
        temp_ambient = $11,
        temp_pulp = $12,
        notes = $13,
        metrics = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      d.productor ?? current.producer,
      d.lote ?? current.lot,
      d.variedad ?? current.variety,
      d.calibre ?? current.caliber,
      d.cod_embalaje ?? current.packaging_code,
      d.embalaje ?? current.packaging_type,
      d.fecha_embalaje ? new Date(d.fecha_embalaje) : current.packaging_date,
      toNumberOrNull(d.peso_neto) ?? current.net_weight,
      toNumberOrNull(d.ss_promedio) ?? current.brix_avg,
      toNumberOrNull(d.t_agua_diping) ?? current.temp_water,
      toNumberOrNull(d.t_ambiente) ?? current.temp_ambient,
      toNumberOrNull(d.t_pulpa_embalada) ?? current.temp_pulp,
      d.observaciones ?? current.notes,
      newMetrics,
      id
    ];

    const upd = await pool.query(updateQ, values);

    await pool.query(
      `INSERT INTO inspection_pdfs (inspection_id, status)
       VALUES ($1, 'PENDING')
       ON CONFLICT (inspection_id)
       DO UPDATE SET status='PENDING', pdf_url=NULL, pdf_hash=NULL, updated_at=NULL, error_message=NULL`,
      [id]
    );

    return res.json({ success: true, inspection: upd.rows[0], pdf_status: 'PENDING' });
  } catch (error) {
    console.error('actualizarInspeccionAdminV2:', error);
    return res.status(500).json({ msg: 'Error interno al actualizar inspección', detalle: error.message });
  }
};

// -------------------------
// ✅ PUT /api/inspecciones/:id/metrics (admin)
// Actualiza SOLO metrics.values y marca PDF PENDING
// -------------------------
exports.actualizarMetricsAdminV2 = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) return res.status(400).json({ msg: 'ID inválido' });

    const body = req.body || {};
    let values = body.values;

    // aceptar values como string JSON
    if (typeof values === 'string') {
      try { values = JSON.parse(values); } catch { values = {}; }
    }
    if (!values || typeof values !== 'object') values = {};

    // buscar inspección + metrics actual
    const curR = await pool.query(
      `SELECT i.metrics, c.code AS commodity_code
       FROM inspections i
       JOIN commodities c ON c.id=i.commodity_id
       WHERE i.id=$1`,
      [id]
    );
    if (curR.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const currentMetrics = curR.rows[0].metrics || {};
    const commodityCode = String(curR.rows[0].commodity_code || '').toUpperCase();
    if (commodityCode === 'CHERRY') return res.status(400).json({ msg: 'CHERRY está deshabilitado' });

    // preservar template_id/version (si no viene, usa el actual)
    const template_id = body.template_id ?? currentMetrics.template_id ?? null;
    const template_version = body.template_version ?? currentMetrics.template_version ?? null;

    const nextMetrics = {
      ...(currentMetrics || {}),
      template_id: template_id ? Number(template_id) : null,
      template_version: template_version ? Number(template_version) : null,
      values
    };

    // update en inspections
    const updR = await pool.query(
      `UPDATE inspections
       SET metrics = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, metrics`,
      [nextMetrics, id]
    );

    // marcar PDF PENDING
    await pool.query(
      `INSERT INTO inspection_pdfs (inspection_id, status)
       VALUES ($1, 'PENDING')
       ON CONFLICT (inspection_id)
       DO UPDATE SET status='PENDING', pdf_url=NULL, pdf_hash=NULL, updated_at=NULL, error_message=NULL`,
      [id]
    );

    return res.json({
      success: true,
      id: Number(id),
      metrics: updR.rows[0]?.metrics,
      pdf_status: 'PENDING'
    });
  } catch (error) {
    console.error('actualizarMetricsAdminV2:', error);
    return res.status(500).json({ msg: 'Error al actualizar métricas', detalle: error.message });
  }
};

// -------------------------
// POST /api/inspecciones/:id/generar-pdf (admin)
// -------------------------
exports.generarPdfInspeccionAdminV2 = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) return res.status(400).json({ msg: 'ID inválido' });

    const inspR = await pool.query(
      `SELECT i.*, c.code AS commodity_code
       FROM inspections i
       JOIN commodities c ON c.id=i.commodity_id
       WHERE i.id=$1`,
      [id]
    );
    if (inspR.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const insp = inspR.rows[0];

    const photosR = await pool.query(
      'SELECT url FROM inspection_photos WHERE inspection_id=$1 ORDER BY id ASC',
      [id]
    );
    const fotosDb = photosR.rows.map(r => r.url);
    const dataForPdf = flattenForPdf({ ...insp, fotos: fotosDb });

    const informesDir = path.join(__dirname, '..', 'informes');
    if (!fs.existsSync(informesDir)) fs.mkdirSync(informesDir, { recursive: true });

    const nombre_archivo = `informe-${insp.commodity_code}-${insp.lot || 'sn'}-${Date.now()}.pdf`;
    const ruta_pdf = path.join(informesDir, nombre_archivo);
    const pdf_url = `/informes/${nombre_archivo}`;

    await generarinforme(dataForPdf, ruta_pdf);

    const hash = await sha256File(ruta_pdf);

    await pool.query(
      `INSERT INTO inspection_pdfs (inspection_id, status, pdf_url, pdf_hash, updated_at, error_message)
       VALUES ($1,'OK',$2,$3,CURRENT_TIMESTAMP,NULL)
       ON CONFLICT (inspection_id)
       DO UPDATE SET status='OK', pdf_url=$2, pdf_hash=$3, updated_at=CURRENT_TIMESTAMP, error_message=NULL`,
      [id, pdf_url, hash]
    );

    return res.json({ success: true, pdf_url, pdf_status: 'OK' });
  } catch (error) {
    console.error('generarPdfInspeccionAdminV2:', error);
    try {
      const { id } = req.params;
      if (/^\d+$/.test(String(id))) {
        await pool.query(
          `INSERT INTO inspection_pdfs (inspection_id, status, error_message, updated_at)
           VALUES ($1,'ERROR',$2,CURRENT_TIMESTAMP)
           ON CONFLICT (inspection_id)
           DO UPDATE SET status='ERROR', error_message=$2, updated_at=CURRENT_TIMESTAMP`,
          [id, String(error.message || 'Error PDF')]
        );
      }
    } catch {}
    return res.status(500).json({ msg: 'Error interno al generar PDF', detalle: error.message });
  }
};

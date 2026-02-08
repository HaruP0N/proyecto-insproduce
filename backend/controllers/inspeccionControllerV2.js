const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { query } = require('../config/db');

function safeJsonParse(s, fallback) {
  try {
    if (s === null || s === undefined) return fallback;
    if (typeof s === 'object') return s;
    return JSON.parse(String(s));
  } catch {
    return fallback;
  }
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

/**
 * POST /api/inspecciones
 * Crea inspección con metrics JSON y guarda fotos (si vienen)
 */
exports.crearInspeccionV2 = async (req, res) => {
  try {
    const body = req.body || {};

    // commodity (puede venir commodity_id o commodity_code)
    let commodity_id = body.commodity_id ? Number(body.commodity_id) : null;

    if (!commodity_id && body.commodity_code) {
      const code = String(body.commodity_code).trim().toUpperCase();
      const c = await query(`SELECT TOP 1 id FROM commodities WHERE code=@code`, { code });
      commodity_id = c.recordset[0]?.id || null;
    }

    if (!commodity_id) {
      return res.status(400).json({ msg: 'commodity_id o commodity_code es obligatorio' });
    }

    const created_by_user_id = req.user?.id ? Number(req.user.id) : null;

    const producer = body.producer ? String(body.producer) : null;
    const lot = body.lot ? String(body.lot) : null;
    const variety = body.variety ? String(body.variety) : null;
    const caliber = body.caliber ? String(body.caliber) : null;

    const packaging_code = body.packaging_code ? String(body.packaging_code) : null;
    const packaging_type = body.packaging_type ? String(body.packaging_type) : null;
    const packaging_date = body.packaging_date ? String(body.packaging_date) : null; // 'YYYY-MM-DD'

    const net_weight = body.net_weight !== undefined && body.net_weight !== null ? Number(body.net_weight) : null;
    const brix_avg = body.brix_avg !== undefined && body.brix_avg !== null ? Number(body.brix_avg) : null;

    const temp_water = body.temp_water !== undefined && body.temp_water !== null ? Number(body.temp_water) : null;
    const temp_ambient = body.temp_ambient !== undefined && body.temp_ambient !== null ? Number(body.temp_ambient) : null;
    const temp_pulp = body.temp_pulp !== undefined && body.temp_pulp !== null ? Number(body.temp_pulp) : null;

    const notes = body.notes !== undefined ? String(body.notes) : null;

    // metrics JSON (en tu Azure es NVARCHAR(MAX))
    const metricsObj = typeof body.metrics === 'string' ? safeJsonParse(body.metrics, {}) : (body.metrics || {});
    const metrics = JSON.stringify(metricsObj || {});

    const ins = await query(
      `INSERT INTO inspections (
        commodity_id, created_by_user_id,
        producer, lot, variety, caliber,
        packaging_code, packaging_type, packaging_date,
        net_weight, brix_avg,
        temp_water, temp_ambient, temp_pulp,
        notes, metrics
      )
      OUTPUT INSERTED.id
      VALUES (
        @commodity_id, @created_by_user_id,
        @producer, @lot, @variety, @caliber,
        @packaging_code, @packaging_type, @packaging_date,
        @net_weight, @brix_avg,
        @temp_water, @temp_ambient, @temp_pulp,
        @notes, @metrics
      )`,
      {
        commodity_id,
        created_by_user_id,
        producer, lot, variety, caliber,
        packaging_code, packaging_type, packaging_date,
        net_weight, brix_avg,
        temp_water, temp_ambient, temp_pulp,
        notes,
        metrics
      }
    );

    const inspectionId = ins.recordset[0].id;

    // fotos (multer)
    const files = [];
    if (req.files?.fotos) files.push(...req.files.fotos);
    if (req.files?.imagenes) files.push(...req.files.imagenes);

    const baseUrl = getBaseUrl(req);

    for (const f of files) {
      const url = `${baseUrl}/uploads/${f.filename}`;
      await query(
        `INSERT INTO inspection_photos (inspection_id, url, label)
         VALUES (@inspection_id, @url, @label)`,
        { inspection_id: inspectionId, url, label: f.originalname || null }
      );
    }

    // crear registro pdf status (PENDING) opcional
    await query(
      `IF NOT EXISTS (SELECT 1 FROM inspection_pdfs WHERE inspection_id=@inspection_id)
       INSERT INTO inspection_pdfs (inspection_id, status) VALUES (@inspection_id, 'PENDING')`,
      { inspection_id: inspectionId }
    );

    return res.json({ ok: true, id: inspectionId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error creando inspección' });
  }
};

/**
 * GET /api/inspecciones/historial (solo admin)
 */
exports.obtenerHistorialV2 = async (req, res) => {
  try {
    const r = await query(
      `SELECT TOP 200
        i.id, i.created_at, i.updated_at,
        i.producer, i.lot, i.variety, i.caliber,
        i.packaging_code, i.packaging_type, i.packaging_date,
        c.code AS commodity_code, c.name AS commodity_name,
        u.email AS created_by_email
       FROM inspections i
       JOIN commodities c ON c.id = i.commodity_id
       LEFT JOIN users u ON u.id = i.created_by_user_id
       ORDER BY i.created_at DESC`
    );

    return res.json(r.recordset);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error obteniendo historial' });
  }
};

/**
 * GET /api/inspecciones/:id (solo admin)
 */
exports.obtenerDetalleV2 = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ msg: 'ID inválido' });

    const r = await query(
      `SELECT TOP 1
        i.*,
        c.code AS commodity_code, c.name AS commodity_name,
        u.email AS created_by_email
       FROM inspections i
       JOIN commodities c ON c.id = i.commodity_id
       LEFT JOIN users u ON u.id = i.created_by_user_id
       WHERE i.id=@id`,
      { id }
    );

    const inspection = r.recordset[0];
    if (!inspection) return res.status(404).json({ msg: 'Inspección no encontrada' });

    inspection.metrics = safeJsonParse(inspection.metrics, {});

    const ph = await query(
      `SELECT id, inspection_id, url, label, created_at
       FROM inspection_photos
       WHERE inspection_id=@inspection_id
       ORDER BY id ASC`,
      { inspection_id: id }
    );

    const pdf = await query(
      `SELECT inspection_id, status, pdf_url, pdf_hash, updated_at, error_message
       FROM inspection_pdfs
       WHERE inspection_id=@inspection_id`,
      { inspection_id: id }
    );

    return res.json({
      inspection,
      photos: ph.recordset,
      pdf: pdf.recordset[0] || null
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error obteniendo detalle' });
  }
};

/**
 * PUT /api/inspecciones/:id (solo admin)
 * Actualiza cabecera (no metrics)
 */
exports.actualizarInspeccionAdminV2 = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ msg: 'ID inválido' });

    const body = req.body || {};

    const producer = body.producer !== undefined ? String(body.producer) : null;
    const lot = body.lot !== undefined ? String(body.lot) : null;
    const variety = body.variety !== undefined ? String(body.variety) : null;
    const caliber = body.caliber !== undefined ? String(body.caliber) : null;

    const packaging_code = body.packaging_code !== undefined ? String(body.packaging_code) : null;
    const packaging_type = body.packaging_type !== undefined ? String(body.packaging_type) : null;
    const packaging_date = body.packaging_date !== undefined ? String(body.packaging_date) : null;

    const net_weight = body.net_weight !== undefined && body.net_weight !== null ? Number(body.net_weight) : null;
    const brix_avg = body.brix_avg !== undefined && body.brix_avg !== null ? Number(body.brix_avg) : null;

    const temp_water = body.temp_water !== undefined && body.temp_water !== null ? Number(body.temp_water) : null;
    const temp_ambient = body.temp_ambient !== undefined && body.temp_ambient !== null ? Number(body.temp_ambient) : null;
    const temp_pulp = body.temp_pulp !== undefined && body.temp_pulp !== null ? Number(body.temp_pulp) : null;

    const notes = body.notes !== undefined ? String(body.notes) : null;

    await query(
      `UPDATE inspections
       SET updated_at = GETDATE(),
           producer=@producer,
           lot=@lot,
           variety=@variety,
           caliber=@caliber,
           packaging_code=@packaging_code,
           packaging_type=@packaging_type,
           packaging_date=@packaging_date,
           net_weight=@net_weight,
           brix_avg=@brix_avg,
           temp_water=@temp_water,
           temp_ambient=@temp_ambient,
           temp_pulp=@temp_pulp,
           notes=@notes
       WHERE id=@id`,
      {
        id,
        producer, lot, variety, caliber,
        packaging_code, packaging_type, packaging_date,
        net_weight, brix_avg,
        temp_water, temp_ambient, temp_pulp,
        notes
      }
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error actualizando inspección' });
  }
};

/**
 * PUT /api/inspecciones/:id/metrics (solo admin)
 */
exports.actualizarMetricsAdminV2 = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ msg: 'ID inválido' });

    const metricsObj = typeof req.body.metrics === 'string'
      ? safeJsonParse(req.body.metrics, {})
      : (req.body.metrics || {});

    const metrics = JSON.stringify(metricsObj || {});

    await query(
      `UPDATE inspections
       SET updated_at = GETDATE(),
           metrics=@metrics
       WHERE id=@id`,
      { id, metrics }
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error actualizando metrics' });
  }
};

/**
 * POST /api/inspecciones/:id/generar-pdf (solo admin)
 * Genera PDF simple y actualiza inspection_pdfs
 */
exports.generarPdfInspeccionAdminV2 = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ msg: 'ID inválido' });

    const r = await query(
      `SELECT TOP 1 i.*, c.code AS commodity_code, c.name AS commodity_name
       FROM inspections i
       JOIN commodities c ON c.id = i.commodity_id
       WHERE i.id=@id`,
      { id }
    );
    const inspection = r.recordset[0];
    if (!inspection) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const metrics = safeJsonParse(inspection.metrics, {});
    const informesDir = path.join(__dirname, '..', process.env.INFORMES_DIR || 'informes');
    ensureDir(informesDir);

    const filename = `inspeccion_${id}.pdf`;
    const filePath = path.join(informesDir, filename);

    // PDF básico
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(16).text('INSPRODUCE - Informe de Inspección', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`ID: ${inspection.id}`);
    doc.text(`Fruta: ${inspection.commodity_name} (${inspection.commodity_code})`);
    doc.text(`Productor: ${inspection.producer || ''}`);
    doc.text(`Lote: ${inspection.lot || ''}`);
    doc.text(`Variedad: ${inspection.variety || ''}`);
    doc.text(`Calibre: ${inspection.caliber || ''}`);
    doc.moveDown();

    doc.text(`Embalaje código: ${inspection.packaging_code || ''}`);
    doc.text(`Embalaje tipo: ${inspection.packaging_type || ''}`);
    doc.text(`Fecha embalaje: ${inspection.packaging_date || ''}`);
    doc.moveDown();

    doc.text(`Peso neto: ${inspection.net_weight ?? ''}`);
    doc.text(`Brix prom.: ${inspection.brix_avg ?? ''}`);
    doc.text(`Temp agua: ${inspection.temp_water ?? ''}`);
    doc.text(`Temp ambiente: ${inspection.temp_ambient ?? ''}`);
    doc.text(`Temp pulpa: ${inspection.temp_pulp ?? ''}`);
    doc.moveDown();

    doc.fontSize(13).text('Métricas (JSON):');
    doc.fontSize(10).text(JSON.stringify(metrics, null, 2));
    doc.moveDown();

    doc.fontSize(12).text('Notas:');
    doc.fontSize(10).text(inspection.notes || '');
    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const pdfHash = sha256File(filePath);
    const baseUrl = getBaseUrl(req);
    const pdfUrl = `${baseUrl}/informes/${filename}`;

    // upsert inspection_pdfs
    await query(
      `IF EXISTS (SELECT 1 FROM inspection_pdfs WHERE inspection_id=@inspection_id)
         UPDATE inspection_pdfs
         SET status='OK',
             pdf_url=@pdf_url,
             pdf_hash=@pdf_hash,
             updated_at=GETDATE(),
             error_message=NULL
         WHERE inspection_id=@inspection_id
       ELSE
         INSERT INTO inspection_pdfs (inspection_id, status, pdf_url, pdf_hash, updated_at)
         VALUES (@inspection_id, 'OK', @pdf_url, @pdf_hash, GETDATE())`,
      { inspection_id: id, pdf_url: pdfUrl, pdf_hash: pdfHash }
    );

    return res.json({ ok: true, pdf_url: pdfUrl, pdf_hash: pdfHash });
  } catch (e) {
    console.error(e);

    // intentar marcar error
    try {
      const id = Number(req.params.id);
      if (id) {
        await query(
          `IF EXISTS (SELECT 1 FROM inspection_pdfs WHERE inspection_id=@inspection_id)
             UPDATE inspection_pdfs
             SET status='ERROR', updated_at=GETDATE(), error_message=@error_message
             WHERE inspection_id=@inspection_id
           ELSE
             INSERT INTO inspection_pdfs (inspection_id, status, updated_at, error_message)
             VALUES (@inspection_id, 'ERROR', GETDATE(), @error_message)`,
          { inspection_id: id, error_message: String(e?.message || 'error') }
        );
      }
    } catch {}

    return res.status(500).json({ msg: 'Error generando PDF' });
  }
};

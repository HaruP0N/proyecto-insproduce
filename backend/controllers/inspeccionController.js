const { pool } = require('../config/db');
const { generarinforme } = require('../utils/generarpdf');
const path = require('path');

const calcularnotasautomaticas = (d) => {
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
    nota_general: nota_gen,
    nota_condicion: (pit_p + pit_a + vir) > 8 ? 'Nota 2' : 'Nota 4',
    nota_calidad: def > 5 ? 'Nota 2' : 'Nota 4',
    apariencia: d.apariencia || (suma_total > 10 ? 'Nota 2' : 'Nota 4'),
    mezcla_color: d.mezcla_color || 'Nota 4'
  };
};

// ✅ Crear inspección: NO genera PDF, deja pdf_actualizado=false
exports.crearinspeccion = async (req, res) => {
  try {
    const d = req.body;
    const rutas_fotos = req.files ? req.files.map((f) => f.path) : [];

    const notas = calcularnotasautomaticas(d);

    const query = `
      INSERT INTO inspecciones (
        productor, lote, variedad, calibre, cod_embalaje, embalaje, fecha_embalaje,
        nro_frutos, apariencia, peso_neto, ss_promedio, pitting_punhead,
        pitting_adhesion, virosis, nota_condicion, deforme, mezcla_color,
        nota_calidad, t_agua_diping, t_ambiente, t_pulpa_embalada, nota_general, fotos, pdf_url, pdf_actualizado
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25
      )
      RETURNING *
    `;

    const valores = [
      d.productor || null,
      d.lote || null,
      d.variedad || null,
      d.calibre || null,
      d.cod_embalaje || null,
      d.embalaje || null,
      d.fecha_embalaje || null,
      d.nro_frutos || null,
      notas.apariencia,
      d.peso_neto || null,
      d.ss_promedio || null,
      d.pitting_punhead || '0',
      d.pitting_adhesion || '0',
      d.virosis || '0',
      notas.nota_condicion,
      d.deforme || '0',
      notas.mezcla_color,
      notas.nota_calidad,
      d.t_agua_diping || null,
      d.t_ambiente || null,
      d.t_pulpa_embalada || null,
      notas.nota_general,
      rutas_fotos,
      null,      // pdf_url
      false      // pdf_actualizado
    ];

    const resultado = await pool.query(query, valores);

    res.json({
      success: true,
      inspeccion: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error crearinspeccion:', error);
    res.status(500).json({ success: false, detalle: error.message });
  }
};

// ✅ Admin: editar inspección → marca pdf_actualizado=false
exports.actualizarInspeccionAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;

    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ msg: 'ID inválido' });
    }

    const actual = await pool.query('SELECT * FROM inspecciones WHERE id = $1', [id]);
    if (actual.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const inspActual = actual.rows[0];
    const merged = { ...inspActual, ...d };

    const notas = calcularnotasautomaticas(merged);

    const updateQuery = `
      UPDATE inspecciones SET
        productor = $1,
        lote = $2,
        variedad = $3,
        calibre = $4,
        cod_embalaje = $5,
        embalaje = $6,
        fecha_embalaje = $7,
        nro_frutos = $8,
        apariencia = $9,
        peso_neto = $10,
        ss_promedio = $11,
        pitting_punhead = $12,
        pitting_adhesion = $13,
        virosis = $14,
        nota_condicion = $15,
        deforme = $16,
        mezcla_color = $17,
        nota_calidad = $18,
        t_agua_diping = $19,
        t_ambiente = $20,
        t_pulpa_embalada = $21,
        nota_general = $22,
        pdf_actualizado = FALSE
      WHERE id = $23
      RETURNING *
    `;

    const valores = [
      merged.productor || null,
      merged.lote || null,
      merged.variedad || null,
      merged.calibre || null,
      merged.cod_embalaje || null,
      merged.embalaje || null,
      merged.fecha_embalaje || null,
      merged.nro_frutos || null,
      notas.apariencia,
      merged.peso_neto || null,
      merged.ss_promedio || null,
      String(merged.pitting_punhead ?? '0'),
      String(merged.pitting_adhesion ?? '0'),
      String(merged.virosis ?? '0'),
      notas.nota_condicion,
      String(merged.deforme ?? '0'),
      notas.mezcla_color,
      notas.nota_calidad,
      merged.t_agua_diping || null,
      merged.t_ambiente || null,
      merged.t_pulpa_embalada || null,
      notas.nota_general,
      id
    ];

    const updated = await pool.query(updateQuery, valores);

    res.json({ success: true, inspeccion: updated.rows[0] });
  } catch (error) {
    console.error('Error actualizarInspeccionAdmin:', error);
    res.status(500).json({ msg: 'Error interno al actualizar inspección' });
  }
};

// ✅ SOLO ADMIN: generar PDF bajo demanda → pdf_actualizado=true
exports.generarPdfInspeccionAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ msg: 'ID inválido' });
    }

    const result = await pool.query('SELECT * FROM inspecciones WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });

    const insp = result.rows[0];

    const notas = calcularnotasautomaticas(insp);

    const nombre_archivo = `informe-${insp.lote || 'sn'}-${Date.now()}.pdf`;
    const ruta_pdf = path.join(__dirname, '../informes', nombre_archivo);
    const pdf_url = `/informes/${nombre_archivo}`;

    const datos_pdf = { ...insp, ...notas, fotos: insp.fotos || [] };

    await generarinforme(datos_pdf, ruta_pdf);

    const upd = await pool.query(
      'UPDATE inspecciones SET pdf_url = $1, pdf_actualizado = TRUE WHERE id = $2 RETURNING pdf_url, pdf_actualizado',
      [pdf_url, id]
    );

    res.json({
      success: true,
      pdf_url: upd.rows[0].pdf_url,
      pdf_actualizado: upd.rows[0].pdf_actualizado
    });
  } catch (error) {
    console.error('Error generarPdfInspeccionAdmin:', error);
    res.status(500).json({ msg: 'Error interno al generar PDF' });
  }
};

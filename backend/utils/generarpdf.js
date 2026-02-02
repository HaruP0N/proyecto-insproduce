// backend/utils/generarpdf.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function safeText(v) {
  if (v === undefined || v === null) return '-';
  const s = String(v).trim();
  return s.length ? s : '-';
}

function formatDateDDMMYY(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';

  // Formato dd/mm/aa (Chile). Forzamos timezone Chile para evitar corrimientos raros.
  try {
    const fmt = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
    return fmt.format(d);
  } catch {
    // Fallback simple
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
}

function groupFieldsByPrefix(fields) {
  // fields: [{label, key, value, unit}, ...]
  // agrupa por "general", "defects", "comments" según "general.xxx"
  const groups = {};
  for (const f of fields) {
    const prefix = (f.key || '').split('.')[0] || 'otros';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(f);
  }
  return groups;
}

function drawSectionTitle(doc, title) {
  doc
    .moveDown(1)
    .fontSize(14)
    .fillColor('#2E7D32')
    .font('Helvetica-Bold')
    .text(title, { underline: false });

  doc
    .moveDown(0.3)
    .strokeColor('#2E7D32')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(0.6);
}

function drawKeyValue(doc, key, value) {
  doc
    .fontSize(11)
    .fillColor('#111')
    .font('Helvetica-Bold')
    .text(`${key}: `, { continued: true });

  doc
    .font('Helvetica')
    .text(`${value}`);
}

exports.generarinforme = async (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // ===== HEADER =====
      doc
        .fontSize(18)
        .fillColor('#2E7D32')
        .font('Helvetica-Bold')
        .text('INSPRODUCE INSPECTION REPORT', { align: 'left' });

      doc
        .moveDown(0.2)
        .fontSize(10)
        .fillColor('#555')
        .font('Helvetica')
        .text('Control de Calidad en Planta');

      // ===== IDENTIFICACIÓN DEL LOTE =====
      drawSectionTitle(doc, 'Identificación del Lote');

      drawKeyValue(doc, 'Productor', safeText(data.productor));
      drawKeyValue(doc, 'Lote', safeText(data.lote));
      drawKeyValue(doc, 'Variedad', safeText(data.variedad));
      drawKeyValue(doc, 'Calibre', safeText(data.calibre));
      drawKeyValue(doc, 'Código Embalaje', safeText(data.cod_embalaje));
      drawKeyValue(doc, 'Tipo Embalaje', safeText(data.embalaje));
      drawKeyValue(doc, 'Fecha Embalaje', formatDateDDMMYY(data.fecha_embalaje));

      // ===== MÉTRICAS (template fields ya resueltos) =====
      // data.metrics_fields: [{ key,label,value,unit,sectionTitle }]
      // si no viene, se intenta usar data.metrics_values directo
      const fields = Array.isArray(data.metrics_fields) ? data.metrics_fields : [];

      if (fields.length) {
        // si tu backend ya arma "sectionTitle", imprimimos ordenado por eso.
        const bySection = {};
        for (const f of fields) {
          const section = f.sectionTitle || 'Parámetros';
          if (!bySection[section]) bySection[section] = [];
          bySection[section].push(f);
        }

        for (const sectionName of Object.keys(bySection)) {
          drawSectionTitle(doc, sectionName);

          for (const f of bySection[sectionName]) {
            const unit = f.unit ? ` ${f.unit}` : '';
            const v = safeText(f.value);
            doc
              .fontSize(11)
              .fillColor('#111')
              .font('Helvetica-Bold')
              .text(`${f.label}: `, { continued: true });

            doc
              .font('Helvetica')
              .text(`${v}${v !== '-' ? unit : ''}`);
          }
        }
      } else if (data.metrics_values && typeof data.metrics_values === 'object') {
        // fallback: imprime values agrupados por prefijo
        const flatFields = Object.entries(data.metrics_values).map(([key, value]) => ({
          key,
          label: key,
          value,
          unit: null
        }));
        const grouped = groupFieldsByPrefix(flatFields);

        const prefixTitles = {
          general: 'Aspectos Generales',
          defects: 'Defectos / Condición',
          comments: 'Comentarios'
        };

        for (const prefix of Object.keys(grouped)) {
          drawSectionTitle(doc, prefixTitles[prefix] || prefix);

          for (const f of grouped[prefix]) {
            doc
              .fontSize(11)
              .fillColor('#111')
              .font('Helvetica-Bold')
              .text(`${f.label}: `, { continued: true });

            doc
              .font('Helvetica')
              .text(`${safeText(f.value)}`);
          }
        }
      }

      // ===== FOTOS =====
      if (Array.isArray(data.fotos) && data.fotos.length) {
        drawSectionTitle(doc, 'Evidencia Fotográfica');

        const baseX = doc.page.margins.left;
        const maxW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        for (const foto of data.fotos) {
          // foto puede venir como "uploads/xxx.jpg"
          const abs = foto.startsWith('uploads')
            ? path.join(__dirname, '..', foto)
            : path.isAbsolute(foto)
              ? foto
              : path.join(__dirname, '..', foto);

          if (fs.existsSync(abs)) {
            try {
              doc.image(abs, baseX, doc.y, { fit: [maxW, 260], align: 'center' });
              doc.moveDown(1);
            } catch {
              doc.fontSize(10).fillColor('#c62828').text(`No se pudo cargar imagen: ${path.basename(abs)}`);
            }
          } else {
            doc.fontSize(10).fillColor('#c62828').text(`Imagen no encontrada: ${abs}`);
          }
        }
      }

      doc.end();

      stream.on('finish', () => resolve(true));
      stream.on('error', (e) => reject(e));
    } catch (e) {
      reject(e);
    }
  });
};

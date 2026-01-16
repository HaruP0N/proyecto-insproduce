const PDFDocument = require('pdfkit');

// Genera el reporte para la temporada 2025-2026
exports.generarReporteCohesivo = (datosInspeccion, res) => {
  const doc = new PDFDocument({ margin: 40 });

  // Encabezado principal basado en el formato de Subsole
  doc.fontSize(16).text('INSPECCIÓN QC PRODUCTO TERMINADO', { align: 'center' });
  doc.fontSize(10).text('Exportadora Subsole S.A. - Temporada 2025-2026', { align: 'center' });
  doc.moveDown();

  // Bloque de información: Lote, Productor y Variedad
  doc.fontSize(12).text('INFORMACIÓN DE LA INSPECCIÓN', { underline: true });
  doc.fontSize(10).text(`Productor: ${datosInspeccion.header.productor}`);
  doc.text(`Variedad: ${datosInspeccion.header.variedad} | Lote: ${datosInspeccion.header.lote}`);
  doc.moveDown();

  // Métricas de calidad (Caja #1)
  doc.fontSize(12).text('DETALLE DE LA INSPECCIÓN', { underline: true });
  doc.fontSize(10).text(`Peso Neto: ${datosInspeccion.detalles.pesoNeto} gr.`);
  doc.text(`Sólidos Solubles: ${datosInspeccion.detalles.ssPromedio}`);
  doc.text(`Temperatura Pulpa: ${datosInspeccion.detalles.tempPulpa}°C`);

  // Renderizado cohesivo de defectos con imagen
  datosInspeccion.defectos.forEach(defecto => {
    if (defecto.porcentaje > 0) {
      doc.addPage(); 
      doc.fontSize(14).text(`${defecto.nombre.toUpperCase()}: ${defecto.porcentaje}%`, { color: 'red' });
      if (defecto.fotoUrl) {
        doc.image(defecto.fotoUrl, { fit: [450, 400], align: 'center' });
      }
    }
  });

  doc.pipe(res);
  doc.end();
};
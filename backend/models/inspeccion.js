const mongoose = require('mongoose');

const InspeccionSchema = new mongoose.Schema({
  header: {
    planta: String, // Ejemplo: GREEN PACK SERVICE SPA [cite: 4]
    productor: String, // Ejemplo: 0179-AGRICOLA EL RESGUARDO S.A [cite: 4]
    lote: String, // Ejemplo: 18 [cite: 4]
    variedad: String, // Ejemplo: SANTINA [cite: 5]
    calibre: String // Ejemplo: 3JD [cite: 7]
  },
  detalles: {
    nroFrutos: Number, // Ejemplo: 50 [cite: 9]
    pesoNeto: Number, // Ejemplo: 5.010 gr [cite: 9]
    ssPromedio: Number, // Ejemplo: 14,00 [cite: 9]
    tempPulpa: Number // Ejemplo: 6,40° [cite: 9]
  },
  defectos: [{
    nombre: String, // Ejemplo: Pitting Punteadura, Virosis, Deforme [cite: 9]
    porcentaje: Number, // Ejemplo: 6.00%, 4.00%, 8.00% [cite: 9]
    fotoUrl: String // Ruta a las fotos de las páginas 3-6 del informe [cite: 25, 32, 38, 44]
  }],
  notas: {
    calidad: Number, // Nota 4 [cite: 9]
    condicion: Number, // Nota 3 [cite: 9]
    general: Number // Nota 4 [cite: 9]
  },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inspeccion', InspeccionSchema);
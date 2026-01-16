// backend/test-data.js
const datosDePrueba = {
  header: {
    planta: "GREEN PACK SERVICE SPA", //
    productor: "0179-AGRICOLA EL RESGUARDO S.A", //
    lote: "18", //
    variedad: "SANTINA", //
    calibre: "3JD" //
  },
  detalles: {
    nroFrutos: 50, //
    pesoNeto: 5010, //
    ssPromedio: 14.00, //
    tempPulpa: 6.40, //
    aparienciaNota: 4 //
  },
  defectos: [
    { nombre: "Pitting Punteadura", porcentaje: 6.00, fotoUrl: "uploads/pitting_puntead.jpg" }, //
    { nombre: "Virosis", porcentaje: 4.00, fotoUrl: "uploads/virosis.jpg" }, //
    { nombre: "Deforme", porcentaje: 8.00, fotoUrl: "uploads/deforme.jpg" } //
  ],
  notasFinales: {
    calidad: 4, //
    condicion: 3, //
    general: 4 //
  },
  temporada: "2025-2026" //
};

console.log("Datos de prueba para la temporada " + datosDePrueba.temporada + " cargados exitosamente.");
module.exports = datosDePrueba;
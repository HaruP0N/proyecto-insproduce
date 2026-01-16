// probar_inspeccion.js
const enviarPrueba = async () => {
    const inspeccion = {
        header: {
            productor: "0179-AGRICOLA EL RESGUARDO S.A",
            lote: "18",
            variedad: "SANTINA",
            calibre: "3JD"
        },
        detalles: {
            pesoNeto: 5010,
            ssPromedio: 14.00,
            tempPulpa: 6.40
        },
        defectos: [
            { nombre: "Virosis", porcentaje: 4.00, fotoUrl: "virosis.jpg" },
            { nombre: "Pitting", porcentaje: 6.00, fotoUrl: "pitting_puntead.jpg" }
        ]
    };

    try {
        const response = await fetch('http://localhost:4000/api/inspecciones/inspeccion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inspeccion)
        });
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
    } catch (error) {
        console.error("Error en la prueba:", error);
    }
};

enviarPrueba();
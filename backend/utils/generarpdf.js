const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Genera un informe PDF profesional basado en los datos de inspección de Subsole
 * @param {object} datos - Datos completos de la inspección
 * @param {string} rutaDestino - Ruta donde se guardará el PDF
 */
const generarinforme = (datos, rutaDestino) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 40,
            bufferPages: true 
        });
        
        const stream = fs.createWriteStream(rutaDestino);
        doc.pipe(stream);

        // Colores corporativos Subsole
        const colorPrimario = '#2E7D32';
        const colorGris = '#495057';
        const colorFondo = '#f8f9fa';

        // ========== PÁGINA 1: INFORMACIÓN PRINCIPAL ==========
        
        // --- Encabezado corporativo ---
        doc.rect(0, 0, 595, 60).fill(colorPrimario);
        
        doc.fillColor('white')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text('Insproduce Inspection & Quality Control', 50, 20);
        
        doc.fontSize(10)
           .font('Helvetica')
           .text('Departamento Control de Calidad | Temporada 2025-2026', 50, 42);

        // Fecha en el encabezado
        doc.fontSize(9)
           .text(`Fecha: ${datos.fecha_embalaje || new Date().toLocaleDateString()}`, 420, 25);

        doc.fillColor('black');
        doc.y = 80; // Posición fija para evitar solapamiento

        // --- Título del documento ---
        doc.fillColor(colorGris)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('INSPECCIÓN QC - PRODUCTO TERMINADO', { align: 'center' });
        
        doc.fontSize(12)
           .font('Helvetica')
           .text('CEREZAS', { align: 'center' });
        
        doc.moveDown(1.5);

        // --- Sección: Información del Lote ---
        dibujarSeccion(doc, 'INFORMACIÓN DEL LOTE', colorPrimario);
        
        const infoLote = [
            ['Productor:', datos.productor || '--', 'Cod. Embalaje:', datos.cod_embalaje || '--'],
            ['Lote:', datos.lote || '--', 'Embalaje:', datos.embalaje || '--'],
            ['Variedad:', datos.variedad || '--', 'Fecha Embalaje:', datos.fecha_embalaje || '--'],
            ['Calibre:', datos.calibre || '--', '', '']
        ];

        const yInicio = doc.y;
        dibujarCuadroInfo(doc, infoLote, yInicio);
        doc.moveDown(2);

        // --- Sección: Resumen Ejecutivo ---
        dibujarSeccion(doc, 'RESUMEN EJECUTIVO', colorPrimario);
        
        const resumenY = doc.y;
        const cardWidth = 118;
        const cardHeight = 60;
        const gap = 10;

        // Tarjetas de resumen (4 notas principales)
        const tarjetas = [
            { titulo: 'NOTA GENERAL', valor: extraerNumeroNota(datos.nota_general), color: obtenerColorNota(datos.nota_general) },
            { titulo: 'CONDICIÓN', valor: extraerNumeroNota(datos.nota_condicion), color: obtenerColorNota(datos.nota_condicion) },
            { titulo: 'CALIDAD', valor: extraerNumeroNota(datos.nota_calidad), color: obtenerColorNota(datos.nota_calidad) },
            { titulo: 'APARIENCIA', valor: extraerNumeroNota(datos.apariencia), color: obtenerColorNota(datos.apariencia) }
        ];

        tarjetas.forEach((tarjeta, i) => {
            const x = 50 + (i * (cardWidth + gap));
            dibujarTarjeta(doc, x, resumenY, cardWidth, cardHeight, tarjeta);
        });

        doc.y = resumenY + cardHeight + 20;

        // --- Sección: Parámetros de Muestra ---
        dibujarSeccion(doc, 'PARÁMETROS DE MUESTRA', colorPrimario);
        
        const parametros = [
            ['Número de Frutos:', `${datos.nro_frutos || '--'} Frutos`, 'Peso Neto:', `${datos.peso_neto || '--'} gr.`],
            ['Sólidos Solubles:', `${datos.ss_promedio || '--'}°Brix`, 'Mezcla Color:', extraerNumeroNota(datos.mezcla_color) || '--']
        ];

        const yParametros = doc.y;
        dibujarCuadroInfo(doc, parametros, yParametros);
        doc.moveDown(2);

        // --- Sección: Análisis de Defectos ---
        dibujarSeccion(doc, 'ANÁLISIS DE DEFECTOS DETECTADOS', colorPrimario);
        doc.moveDown(0.5);

        // Tabla de defectos (solo los 4 que pide la empresa)
        const defectos = [
            { nombre: 'Pitting Punteado', valor: parseFloat(datos.pitting_punhead) || 0 },
            { nombre: 'Pitting Adhesión', valor: parseFloat(datos.pitting_adhesion) || 0 },
            { nombre: 'Virosis', valor: parseFloat(datos.virosis) || 0 },
            { nombre: 'Deforme', valor: parseFloat(datos.deforme) || 0 }
        ];

        dibujarTablaDefectos(doc, defectos);
        doc.moveDown(2);

        // --- Sección: Control de Temperaturas ---
        dibujarSeccion(doc, 'CONTROL DE TEMPERATURAS', colorPrimario);
        
        const tempY = doc.y;
        dibujarCuadroTemperaturas(doc, tempY, {
            aguaDipping: datos.t_agua_diping || '--',
            ambiente: datos.t_ambiente || '--',
            pulpa: datos.t_pulpa_embalada || '--'
        });
        doc.moveDown(3);

        // --- Estado de Aprobación ---
        const estado = determinarEstado(datos.nota_general);
        const colorEstado = estado === 'APROBADO' ? '#28a745' : '#dc3545';
        
        doc.rect(200, doc.y, 195, 35).fill(colorEstado);
        doc.fillColor('white')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`✓ ${estado}`, 0, doc.y + 10, { align: 'center' });

        doc.moveDown(3);

        // --- Pie de página ---
        doc.fillColor(colorGris)
           .fontSize(8)
           .font('Helvetica')
           .text('_______________________________', 100, 700);
        doc.text('Inspector de Calidad', 100, 715, { width: 150, align: 'center' });

        doc.fontSize(7)
           .fillColor('#999')
           .text('Exportadora Subsole S.A. | Control de Calidad - Temporada 2025-2026', 320, 715);

        // ========== PÁGINA 2: REGISTRO FOTOGRÁFICO ==========
        
        if (datos.fotos && datos.fotos.length > 0) {
            doc.addPage();
            
            // Encabezado de página de fotos
            doc.rect(0, 0, 595, 50).fill(colorPrimario);
            doc.fillColor('white')
               .fontSize(18)
               .font('Helvetica-Bold')
               .text('REGISTRO FOTOGRÁFICO', 0, 18, { align: 'center' });
            
            doc.fillColor(colorGris)
               .fontSize(10)
               .font('Helvetica')
               .text(`Lote: ${datos.lote} | Variedad: ${datos.variedad}`, 0, 35, { align: 'center' });

            doc.moveDown(3);

            // Layout de fotos: 2 por página, centradas
            const fotoWidth = 450;
            const fotoHeight = 280;
            let fotoIndex = 0;

            datos.fotos.forEach((foto, index) => {
                // Manejar tanto rutas simples como objetos con metadatos
                const rutaFoto = typeof foto === 'string' ? foto : foto.ruta || foto.path;
                const rutaAbsoluta = path.isAbsolute(rutaFoto) ? rutaFoto : path.join(__dirname, '..', rutaFoto);

                if (fs.existsSync(rutaAbsoluta)) {
                    // Si ya hay 2 fotos, crear nueva página
                    if (fotoIndex > 0 && fotoIndex % 2 === 0) {
                        doc.addPage();
                        doc.rect(0, 0, 595, 50).fill(colorPrimario);
                        doc.fillColor('white')
                           .fontSize(18)
                           .font('Helvetica-Bold')
                           .text('REGISTRO FOTOGRÁFICO (cont.)', 0, 18, { align: 'center' });
                    }

                    // Calcular posición vertical
                    const esSegundaFoto = fotoIndex % 2 === 1;
                    const yFoto = esSegundaFoto ? 400 : 80;

                    // Marco de la foto
                    doc.rect(67, yFoto - 5, fotoWidth + 10, fotoHeight + 50)
                       .fillAndStroke('#ffffff', '#dee2e6');

                    // Insertar imagen
                    try {
                        doc.image(rutaAbsoluta, 72, yFoto, {
                            fit: [fotoWidth, fotoHeight],
                            align: 'center',
                            valign: 'center'
                        });

                        // Etiqueta de la foto
                        doc.rect(67, yFoto + fotoHeight, fotoWidth + 10, 45)
                           .fill(colorFondo);
                        
                        const titulo = typeof foto === 'object' ? foto.titulo : `Figura ${index + 1}`;
                        const descripcion = typeof foto === 'object' ? foto.descripcion : `Evidencia fotográfica - Lote ${datos.lote}`;
                        
                        doc.fillColor(colorGris)
                           .fontSize(10)
                           .font('Helvetica-Bold')
                           .text(titulo || `Figura ${index + 1}`, 72, yFoto + fotoHeight + 10, { width: fotoWidth, align: 'center' });
                        
                        doc.fontSize(8)
                           .font('Helvetica')
                           .fillColor('#868e96')
                           .text(descripcion || `Evidencia de inspección - Lote ${datos.lote}`, 72, yFoto + fotoHeight + 25, { width: fotoWidth, align: 'center' });
                        
                        fotoIndex++;
                    } catch (error) {
                        console.error(`Error al insertar imagen ${rutaFoto}:`, error);
                    }
                }
            });
        }

        // Finalizar documento
        doc.end();
        
        stream.on('finish', () => resolve(rutaDestino));
        stream.on('error', (err) => reject(err));
    });
};

// ========== FUNCIONES AUXILIARES ==========

function dibujarSeccion(doc, titulo, color) {
    doc.fillColor(color)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(titulo, 50, doc.y);
    
    doc.moveTo(50, doc.y + 2)
       .lineTo(545, doc.y + 2)
       .lineWidth(2)
       .stroke(color);
    
    doc.moveDown(1);
}

function dibujarCuadroInfo(doc, filas, yInicio) {
    const altoFila = 18;
    const alturaTotal = filas.length * altoFila + 10;
    
    doc.rect(50, yInicio, 495, alturaTotal).fillAndStroke('#f8f9fa', '#dee2e6');
    
    filas.forEach((fila, i) => {
        const y = yInicio + 10 + (i * altoFila);
        
        // Columna izquierda
        doc.fillColor('#495057')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(fila[0], 60, y);
        
        doc.font('Helvetica')
           .text(fila[1], 150, y);
        
        // Columna derecha (si existe)
        if (fila[2]) {
            doc.font('Helvetica-Bold')
               .text(fila[2], 310, y);
            
            doc.font('Helvetica')
               .text(fila[3], 400, y);
        }
    });
    
    doc.y = yInicio + alturaTotal + 5;
}

function dibujarTarjeta(doc, x, y, width, height, tarjeta) {
    // Fondo de la tarjeta
    const colorFondo = tarjeta.color === '#28a745' ? '#f1f9f3' : '#fff9f0';
    doc.rect(x, y, width, height).fillAndStroke(colorFondo, tarjeta.color);
    
    // Título
    doc.fillColor('#666')
       .fontSize(8)
       .font('Helvetica-Bold')
       .text(tarjeta.titulo, x, y + 10, { width: width, align: 'center' });
    
    // Valor
    doc.fillColor(tarjeta.color)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(tarjeta.valor, x, y + 25, { width: width, align: 'center' });
    
    // Subtítulo
    doc.fillColor('#666')
       .fontSize(7)
       .font('Helvetica')
       .text(obtenerCategoria(tarjeta.valor), x, y + 48, { width: width, align: 'center' });
}

function dibujarTablaDefectos(doc, defectos) {
    const yInicio = doc.y;
    const anchoTotal = 495;
    const altoEncabezado = 25;
    const altoFila = 22;
    
    // Encabezado de la tabla
    doc.rect(50, yInicio, anchoTotal, altoEncabezado).fill('#495057');
    doc.fillColor('white')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DEFECTO', 70, yInicio + 8);
    doc.text('PORCENTAJE DETECTADO', 380, yInicio + 8);

    // Filas de defectos
    defectos.forEach((def, i) => {
        const yFila = yInicio + altoEncabezado + (i * altoFila);
        
        // Alternar colores de fondo
        const colorFondo = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
        doc.rect(50, yFila, anchoTotal, altoFila).fill(colorFondo);
        
        // Nombre del defecto
        doc.fillColor('#495057')
           .fontSize(9)
           .font('Helvetica')
           .text(def.nombre, 70, yFila + 6);
        
        // Badge de porcentaje
        const valorColor = def.valor === 0 ? '#d4edda' : def.valor < 5 ? '#fff3cd' : '#f8d7da';
        const textoColor = def.valor === 0 ? '#155724' : def.valor < 5 ? '#856404' : '#721c24';
        
        doc.rect(400, yFila + 4, 60, 14).fill(valorColor);
        doc.fillColor(textoColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(`${def.valor.toFixed(1)}%`, 400, yFila + 6, { width: 60, align: 'center' });
    });

    // Borde de la tabla
    doc.rect(50, yInicio, anchoTotal, altoEncabezado + (defectos.length * altoFila)).stroke('#dee2e6');
    
    doc.y = yInicio + altoEncabezado + (defectos.length * altoFila) + 5;
}

function dibujarCuadroTemperaturas(doc, y, temps) {
    doc.rect(50, y, 495, 50).fillAndStroke('#e7f3ff', '#b3d9ff');
    
    const tempWidth = 165;
    const titulos = ['🌡️ AGUA DIPPING', '🌡️ AMBIENTE', '🌡️ PULPA EMBALADA'];
    const valores = [temps.aguaDipping, temps.ambiente, temps.pulpa];

    valores.forEach((val, i) => {
        const x = 50 + (i * tempWidth);
        
        doc.fillColor('#666')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(titulos[i], x, y + 10, { width: tempWidth, align: 'center' });
        
        doc.fillColor('#0066cc')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text(`${val}°C`, x, y + 25, { width: tempWidth, align: 'center' });
    });

    doc.y = y + 55;
}

function extraerNumeroNota(nota) {
    if (!nota) return '--';
    // Si ya es un número, retornarlo
    if (typeof nota === 'number') return nota.toString();
    // Extraer número de strings como "Nota 4" o "4"
    const match = nota.toString().match(/\d+/);
    return match ? match[0] : nota;
}

function obtenerColorNota(nota) {
    const num = parseInt(extraerNumeroNota(nota));
    if (isNaN(num)) return '#6c757d';
    if (num >= 3) return '#28a745'; // Verde para notas buenas
    return '#ffc107'; // Amarillo para notas bajas
}

function obtenerCategoria(valor) {
    const num = parseInt(valor);
    if (isNaN(num)) return '';
    if (num >= 4) return 'Excelente';
    if (num >= 3) return 'Buena';
    if (num >= 2) return 'Aceptable';
    return 'Regular';
}

function determinarEstado(notaGeneral) {
    const num = parseInt(extraerNumeroNota(notaGeneral));
    if (isNaN(num)) return 'PENDIENTE';
    return num >= 3 ? 'APROBADO' : 'OBSERVADO';
}

module.exports = { generarinforme };
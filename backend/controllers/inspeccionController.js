const { pool } = require('../config/db');
const { generarinforme } = require('../utils/generarpdf');
const path = require('path');

/**
 * lógica para calcular notas automáticamente
 */
const calcularnotasautomaticas = (d) => {
    const pit_p = parseFloat(d.pitting_punhead) || 0;
    const pit_a = parseFloat(d.pitting_adhesion) || 0;
    const vir = parseFloat(d.virosis) || 0;
    const def = parseFloat(d.deforme) || 0;

    const suma_total = pit_p + pit_a + vir + def;

    // nota general basada en umbrales frutícolas
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

exports.crearinspeccion = async (req, res) => {
    try {
        const d = req.body;
        const rutas_fotos = req.files ? req.files.map(f => f.path) : [];

        // 1. calcular las notas automáticamente
        const notas = calcularnotasautomaticas(d);

        // 2. consolidar datos para el pdf (asegurando nombres que usa generarpdf.js)
        const datos_pdf = {
            ...d,
            ...notas,
            // aseguramos campos técnicos que a veces llegan vacíos
            nro_trypack: d.nro_trypack || '--',
            cod_embalaje: d.cod_embalaje || '--',
            embalaje: d.embalaje || '--',
            calibre: d.calibre || '--',
            peso_neto: d.peso_neto || '--',
            ss_promedio: d.ss_promedio || '--',
            nro_frutos: d.nro_frutos || '--',
            fotos: rutas_fotos
        };

        // 3. inserción en base de datos
        const query = `
            INSERT INTO inspecciones (
                productor, lote, variedad, calibre, cod_embalaje, embalaje, fecha_embalaje,
                nro_frutos, apariencia, peso_neto, ss_promedio, pitting_punhead,
                pitting_adhesion, virosis, nota_condicion, deforme, mezcla_color,
                nota_calidad, t_agua_diping, t_ambiente, t_pulpa_embalada, nota_general, fotos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING id`;

        const valores = [
            d.productor,
            d.lote,
            d.variedad,
            d.calibre,
            d.cod_embalaje,
            d.embalaje,
            d.fecha_embalaje,
            d.nro_frutos,
            notas.apariencia,
            d.peso_neto,
            d.ss_promedio,
            d.pitting_punhead || '0',
            d.pitting_adhesion || '0',
            d.virosis || '0',
            notas.nota_condicion,
            d.deforme || '0',
            notas.mezcla_color,
            notas.nota_calidad,
            d.t_agua_diping,
            d.t_ambiente,
            d.t_pulpa_embalada,
            notas.nota_general,
            rutas_fotos
        ];

        const resultado = await pool.query(query, valores);
        
        // 4. generar el archivo pdf
        const nombre_archivo = `informe-${d.lote || 'sn'}-${Date.now()}.pdf`;
        const ruta_pdf = path.join(__dirname, '../informes', nombre_archivo);
        
        await generarinforme(datos_pdf, ruta_pdf);

        // 5. respuesta al frontend
        res.json({
            success: true,
            pdf_url: `/informes/${nombre_archivo}`
        });

    } catch (error) {
        console.error("error critico en el controlador:", error.message);
        res.status(500).json({ 
            success: false, 
            detalle: error.message 
        });
    }
};
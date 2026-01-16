import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Thermometer, Box, Search, MessageSquare } from 'lucide-react';
import axios from 'axios';

const FormularioInspeccion = () => {
    const [fotos, setFotos] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estado unificado siguiendo tu formato exacto
    const [formdata, setFormdata] = useState({
        productor: '', lote: '', variedad: '', calibre: '',
        cod_embalaje: '', embalaje: '', fecha_embalaje: '',
        nro_trypack: '', nro_frutos: '', peso_neto: '',
        ss_promedio: '', pitting_punhead: '0', pitting_adhesion: '0',
        virosis: '0', deforme: '0', t_agua_diping: '',
        t_ambiente: '', t_pulpa_embalada: '', observaciones: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormdata({ ...formdata, [name]: value });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFotos(files);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const data = new FormData();
        // Adjuntamos todos los campos de texto
        Object.keys(formdata).forEach(key => data.append(key, formdata[key]));
        // Adjuntamos las imágenes
        fotos.forEach(foto => data.append('imagenes', foto));

        try {
            // Conexión al puerto 4000 según tu terminal
            const res = await axios.post('http://localhost:4000/api/inspecciones/inspeccion', data);
            if(res.data.success) {
                alert("✓ Inspección Insproduce guardada con éxito.");
                // Abrir el PDF generado en una pestaña nueva
                window.open(`http://localhost:4000${res.data.pdf_url}`, '_blank');
            }
        } catch (err) {
            console.error(err);
            alert("✗ Error al conectar con el servidor en el puerto 4000. Asegúrate de que el backend esté corriendo.");
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { minHeight: '100vh', backgroundColor: '#f4f7f4', padding: '20px', fontFamily: 'Segoe UI, Roboto, sans-serif' },
        card: { maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' },
        header: { backgroundColor: '#2E7D32', color: '#fff', padding: '30px', textAlign: 'center', borderBottom: '6px solid #FFB300' },
        section: { padding: '25px', borderBottom: '1px solid #eee' },
        sectionTitle: { display: 'flex', alignItems: 'center', gap: '10px', color: '#2E7D32', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 'bold' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
        label: { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '5px', textTransform: 'uppercase' },
        input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', outlineColor: '#4CAF50' },
        button: { width: '100%', padding: '18px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
        textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>INSPRODUCE INSPECTION SYSTEM</h1>
                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Control de Calidad en Planta</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 1. DATOS DE ORIGEN Y EMBALAJE */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}><Box size={20}/> Identificación del Lote</div>
                        <div style={styles.grid}>
                            <div><label style={styles.label}>Productor</label><input style={styles.input} name="productor" onChange={handleChange} required /></div>
                            <div><label style={styles.label}>Lote / Serie</label><input style={styles.input} name="lote" onChange={handleChange} required /></div>
                            <div><label style={styles.label}>Variedad</label><input style={styles.input} name="variedad" onChange={handleChange} /></div>
                            <div><label style={styles.label}>Calibre</label><input style={styles.input} name="calibre" onChange={handleChange} /></div>
                            <div><label style={styles.label}>Cod. Embalaje</label><input style={styles.input} name="cod_embalaje" onChange={handleChange} /></div>
                            <div><label style={styles.label}>Tipo Embalaje</label><input style={styles.input} name="embalaje" onChange={handleChange} /></div>
                            <div><label style={styles.label}>Fecha Embalaje</label><input type="date" style={styles.input} name="fecha_embalaje" onChange={handleChange} /></div>
                        </div>
                    </div>

                    {/* 2. PARÁMETROS DE CALIDAD */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}><Search size={20}/> Parámetros Físicos y Condición</div>
                        <div style={styles.grid}>
                            <div><label style={styles.label}>Peso Neto (gr)</label><input type="number" step="0.01" style={styles.input} name="peso_neto" onChange={handleChange} /></div>
                            <div><label style={styles.label}>SS Promedio (°Brix)</label><input type="number" step="0.1" style={styles.input} name="ss_promedio" onChange={handleChange} /></div>
                            <div><label style={styles.label}>N° Frutos</label><input type="number" style={styles.input} name="nro_frutos" onChange={handleChange} /></div>
                            <div><label style={styles.label}>N° Trypack</label><input style={styles.input} name="nro_trypack" onChange={handleChange} /></div>
                        </div>
                        <div style={{ ...styles.grid, marginTop: '15px' }}>
                            <div><label style={styles.label}>% Pitting Punhead</label><input type="number" style={styles.input} name="pitting_punhead" onChange={handleChange} /></div>
                            <div><label style={styles.label}>% Pitting Adhesión</label><input type="number" style={styles.input} name="pitting_adhesion" onChange={handleChange} /></div>
                            <div><label style={styles.label}>% Virosis</label><input type="number" style={styles.input} name="virosis" onChange={handleChange} /></div>
                            <div><label style={styles.label}>% Deforme</label><input type="number" style={styles.input} name="deforme" onChange={handleChange} /></div>
                        </div>
                    </div>

                    {/* 3. TEMPERATURAS */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}><Thermometer size={20}/> Control de Temperaturas (°C)</div>
                        <div style={styles.grid}>
                            <div><label style={styles.label}>T° Agua Dipping</label><input style={styles.input} name="t_agua_diping" onChange={handleChange} /></div>
                            <div><label style={styles.label}>T° Ambiente</label><input style={styles.input} name="t_ambiente" onChange={handleChange} /></div>
                            <div><label style={styles.label}>T° Pulpa Embalada</label><input style={styles.input} name="t_pulpa_embalada" onChange={handleChange} /></div>
                        </div>
                    </div>

                    {/* 4. FOTOS Y OBSERVACIONES */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}><Upload size={20}/> Evidencia y Comentarios</div>
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ marginBottom: '15px' }} />
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                            {previews.map((src, i) => (
                                <img key={i} src={src} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />
                            ))}
                        </div>
                        <label style={styles.label}>Observaciones Generales</label>
                        <textarea 
                            style={styles.textarea} 
                            name="observaciones" 
                            onChange={handleChange} 
                            placeholder="Escriba aquí cualquier detalle relevante de la inspección..."
                        />
                    </div>

                    <div style={{ padding: '0 25px 25px' }}>
                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'PROCESANDO INFORME...' : 'GUARDAR INSPECCIÓN Y GENERAR PDF'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FormularioInspeccion;
// frontend/src/components/PanelAdmin.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, AlertTriangle, Edit, PlusCircle } from 'lucide-react';

const PanelAdmin = () => {
    const [inspecciones, setInspecciones] = useState([]);
    const [metricas, setMetricas] = useState({ total: 0, alertas: 0, brixPromedio: 0 });
    const [loading, setLoading] = useState(true);

    // Cargar datos al montar el componente
    useEffect(() => {
        fetchDatos();
    }, []);

    const fetchDatos = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:4000/api/inspecciones/historial', {
                headers: { 'x-auth-token': token }
            });
            setInspecciones(res.data);
            calcularMetricas(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error al cargar historial:", err);
            setLoading(false);
        }
    };

    const calcularMetricas = (datos) => {
        const total = datos.length;
        // Alerta si hay más de 5% de fruta deforme o pitting
        const alertas = datos.filter(i => parseFloat(i.deforme) > 5 || parseFloat(i.pitting_punhead) > 5).length;
        const brixSum = datos.reduce((acc, curr) => acc + parseFloat(curr.ss_promedio || 0), 0);
        const promedio = total > 0 ? (brixSum / total).toFixed(1) : 0;

        setMetricas({ total, alertas, brixPromedio: promedio });
    };

    const styles = {
        container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
        statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' },
        iconBox: (color) => ({ backgroundColor: color, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
        tableContainer: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
        th: { backgroundColor: '#f8f9fa', padding: '15px', textAlign: 'left', color: '#2E7D32', borderBottom: '2px solid #eee', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold' },
        td: { padding: '15px', borderBottom: '1px solid #eee' },
        btnEdit: { display: 'flex', alignItems: 'center', gap: '5px', color: '#1976d2', border: '1px solid #1976d2', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', background: 'none', fontSize: '12px' },
        badge: (isAlert) => ({
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            backgroundColor: isAlert ? '#ffebee' : '#e8f5e9',
            color: isAlert ? '#c62828' : '#2E7D32'
        })
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Cargando Panel de Control...</div>;

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ color: '#2E7D32', margin: 0 }}>Panel Administrativo</h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>Gestión de inspecciones y asignación de tareas</p>
                </div>
                <button style={{ backgroundColor: '#2E7D32', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <PlusCircle size={18}/> Designar Inspección
                </button>
            </div>

            {/* MÉTRICAS DE TEMPORADA */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.iconBox('#e8f5e9')}><ClipboardList color="#2E7D32" /></div>
                    <div><span style={{ color: '#888', fontSize: '12px' }}>Total Reportes</span><h2 style={{ margin: 0 }}>{metricas.total}</h2></div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox('#fff3e0')}><TrendingUp color="#ef6c00" /></div>
                    <div><span style={{ color: '#888', fontSize: '12px' }}>Brix Promedio</span><h2 style={{ margin: 0 }}>{metricas.brixPromedio}°</h2></div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.iconBox('#ffebee')}><AlertTriangle color="#c62828" /></div>
                    <div><span style={{ color: '#888', fontSize: '12px' }}>Lotes con Alerta</span><h2 style={{ margin: 0 }}>{metricas.alertas}</h2></div>
                </div>
            </div>

            {/* TABLA DE SEGUIMIENTO */}
            <div style={styles.tableContainer}>
                <div style={{ padding: '15px', backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} color="#2E7D32" />
                    <span style={{ fontWeight: 'bold', color: '#2E7D32' }}>Historial de Inspecciones por Trabajador</span>
                </div>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Fecha</th>
                            <th style={styles.th}>Lote / Productor</th>
                            <th style={styles.th}>Inspector</th>
                            <th style={styles.th}>Variedad</th>
                            <th style={styles.th}>Brix</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inspecciones.map((insp) => {
                            const tieneAlerta = parseFloat(insp.deforme) > 5;
                            return (
                                <tr key={insp.id}>
                                    <td style={styles.td}>{new Date(insp.created_at).toLocaleDateString()}</td>
                                    <td style={styles.td}>
                                        <strong>{insp.lote}</strong><br/>
                                        <span style={{ fontSize: '12px', color: '#888' }}>{insp.productor}</span>
                                    </td>
                                    <td style={styles.td}>{insp.usuario_nombre || 'Inspector Planta'}</td>
                                    <td style={styles.td}>{insp.variedad}</td>
                                    <td style={styles.td}>{insp.ss_promedio}°</td>
                                    <td style={styles.td}>
                                        <span style={styles.badge(tieneAlerta)}>
                                            {tieneAlerta ? 'REVISIÓN REQUERIDA' : 'ÓPTIMO'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => alert('Abriendo segunda revisión para el lote: ' + insp.lote)}
                                            style={styles.btnEdit}
                                        >
                                            <Edit size={14} /> Revisar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PanelAdmin;

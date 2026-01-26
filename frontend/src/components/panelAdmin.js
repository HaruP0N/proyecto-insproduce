// frontend/src/components/panelAdmin.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PanelTrabajadores from './PanelTrabajadores';
import { ClipboardList, Users } from 'lucide-react';

const API_BASE = 'http://localhost:4000';

function InspeccionesTab() {
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal edición
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // filtros
  const [search, setSearch] = useState('');
  const [soloPendientePDF, setSoloPendientePDF] = useState(false);

  const token = localStorage.getItem('token');

  const fetchDatos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`${API_BASE}/api/inspecciones/historial`, {
        headers: { 'x-auth-token': token }
      });
      setInspecciones(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.msg || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pdfEstaOk = (i) => {
    // Si existe el flag pdf_actualizado, úsalo.
    // Si no existe, considera OK si hay pdf_url.
    if (typeof i.pdf_actualizado === 'boolean') return i.pdf_actualizado && !!i.pdf_url;
    return !!i.pdf_url;
  };

  const metricas = useMemo(() => {
    const total = inspecciones.length;
    const alertas = inspecciones.filter(i => parseFloat(i.deforme || 0) > 5 || parseFloat(i.pitting_punhead || 0) > 5).length;
    const brixSum = inspecciones.reduce((acc, curr) => acc + parseFloat(curr.ss_promedio || 0), 0);
    const brixPromedio = total > 0 ? (brixSum / total).toFixed(1) : '0.0';
    const pdfPendientes = inspecciones.filter(i => !pdfEstaOk(i)).length;

    return { total, alertas, brixPromedio, pdfPendientes };
  }, [inspecciones]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inspecciones.filter((i) => {
      const matchText =
        !q ||
        String(i.lote || '').toLowerCase().includes(q) ||
        String(i.productor || '').toLowerCase().includes(q) ||
        String(i.variedad || '').toLowerCase().includes(q);

      const matchPDF = !soloPendientePDF || !pdfEstaOk(i);

      return matchText && matchPDF;
    });
  }, [inspecciones, search, soloPendientePDF]);

  const openModal = (insp) => {
    setSelected({ ...insp }); // copia editable
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setSelected(prev => ({ ...prev, [field]: value }));
  };

  const normalizarNumero = (v, { min = 0, max = 100 } = {}) => {
    if (v === '' || v === null || v === undefined) return '';
    const n = Number(String(v).replace(',', '.'));
    if (Number.isNaN(n)) return '';
    const clamped = Math.max(min, Math.min(max, n));
    return String(clamped);
  };

  const guardarEdicion = async () => {
    if (!selected?.id) return;
    setSaving(true);

    try {
      const payload = {
        productor: String(selected.productor || '').trim(),
        lote: String(selected.lote || '').trim(),
        variedad: String(selected.variedad || '').trim(), // ✅ corregido
        calibre: String(selected.calibre || '').trim(),
        cod_embalaje: String(selected.cod_embalaje || '').trim(),
        embalaje: String(selected.embalaje || '').trim(),
        fecha_embalaje: String(selected.fecha_embalaje || '').trim(),
        nro_frutos: String(selected.nro_frutos || '').trim(),

        pitting_punhead: normalizarNumero(selected.pitting_punhead, { min: 0, max: 100 }),
        pitting_adhesion: normalizarNumero(selected.pitting_adhesion, { min: 0, max: 100 }),
        virosis: normalizarNumero(selected.virosis, { min: 0, max: 100 }),
        deforme: normalizarNumero(selected.deforme, { min: 0, max: 100 }),

        ss_promedio: normalizarNumero(selected.ss_promedio, { min: 0, max: 30 }),
        peso_neto: normalizarNumero(selected.peso_neto, { min: 0, max: 99999 }),

        t_agua_diping: normalizarNumero(selected.t_agua_diping, { min: -10, max: 50 }),
        t_ambiente: normalizarNumero(selected.t_ambiente, { min: -10, max: 50 }),
        t_pulpa_embalada: normalizarNumero(selected.t_pulpa_embalada, { min: -10, max: 50 }),

        // notas (opcionales)
        apariencia: String(selected.apariencia || '').trim(),
        nota_condicion: String(selected.nota_condicion || '').trim(),
        nota_calidad: String(selected.nota_calidad || '').trim(),
        nota_general: String(selected.nota_general || '').trim(),
        mezcla_color: String(selected.mezcla_color || '').trim(),
      };

      await axios.put(`${API_BASE}/api/inspecciones/${selected.id}`, payload, {
        headers: { 'x-auth-token': token }
      });

      await fetchDatos();
      closeModal();
      alert('✅ Cambios guardados (PDF queda pendiente si usas pdf_actualizado=false).');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || err.message || 'Error al guardar');
      setSaving(false);
    }
  };

  const generarPDF = async (insp) => {
    try {
      await axios.post(`${API_BASE}/api/inspecciones/${insp.id}/generar-pdf`, {}, {
        headers: { 'x-auth-token': token }
      });
      await fetchDatos();
      alert('✅ PDF generado');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || err.message || 'Error al generar PDF');
    }
  };

  const verPDF = (insp) => {
    if (!insp.pdf_url) return;
    const url = insp.pdf_url.startsWith('http')
      ? insp.pdf_url
      : `${API_BASE}${insp.pdf_url.startsWith('/') ? '' : '/'}${insp.pdf_url}`;
    window.open(url, '_blank');
  };

  const styles = {
    container: { maxWidth: 1200, margin: '0 auto', padding: 10 },
    topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
    title: { margin: 0, color: '#2E7D32' },
    subtitle: { margin: '4px 0 0', color: '#666', fontSize: 14 },
    filtersRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
    input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', minWidth: 260 },
    checkbox: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#444' },

    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 },
    statCard: { background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },

    tableWrap: { background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' },
    tableHeader: { padding: 14, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, color: '#2E7D32', fontWeight: 'bold' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: { background: '#f8f9fa', padding: 12, textAlign: 'left', color: '#2E7D32', borderBottom: '2px solid #eee', fontSize: 11, textTransform: 'uppercase' },
    td: { padding: 12, borderBottom: '1px solid #eee', verticalAlign: 'top' },

    badge: (kind) => {
      const map = {
        ok: { bg: '#e8f5e9', fg: '#2E7D32' },
        danger: { bg: '#ffebee', fg: '#c62828' },
        pdfOk: { bg: '#e3f2fd', fg: '#1565c0' },
        pdfPend: { bg: '#fce4ec', fg: '#ad1457' },
      };
      const c = map[kind] || { bg: '#eee', fg: '#333' };
      return { display: 'inline-block', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 'bold', background: c.bg, color: c.fg };
    },

    btn: (variant) => {
      const base = { borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', border: '1px solid transparent' };
      if (variant === 'outline') return { ...base, background: '#fff', borderColor: '#2E7D32', color: '#2E7D32' };
      if (variant === 'blue') return { ...base, background: '#1565c0', color: '#fff' };
      if (variant === 'gray') return { ...base, background: '#607d8b', color: '#fff' };
      return { ...base, background: '#2E7D32', color: '#fff' };
    },

    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 },
    modal: { width: '100%', maxWidth: 900, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' },
    modalHeader: { padding: 14, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { margin: 0, color: '#2E7D32' },
    modalBody: { padding: 14 },
    modalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
    label: { fontSize: 11, fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
    field: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ddd' },
    modalFooter: { padding: 14, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 },
  };

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}>Cargando panel de inspecciones...</div>;
  if (errorMsg) return <div style={{ padding: 30, color: '#c62828' }}>{errorMsg}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Panel Administrativo — Inspecciones</h2>
          <p style={styles.subtitle}>Historial, métricas, edición y PDF</p>
        </div>

        <div style={styles.filtersRow}>
          <input
            style={styles.input}
            placeholder="Buscar por lote, productor, variedad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={soloPendientePDF}
              onChange={(e) => setSoloPendientePDF(e.target.checked)}
            />
            Solo PDF pendiente
          </label>

          <button style={styles.btn('outline')} onClick={fetchDatos}>Refrescar</button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>Total Reportes</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>Brix Promedio</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.brixPromedio}°</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>Lotes con Alerta</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.alertas}</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>PDF Pendientes</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.pdfPendientes}</div>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <div style={styles.tableHeader}>
          <ClipboardList size={18} />
          Historial de Inspecciones
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Lote / Productor</th>
              <th style={styles.th}>Variedad</th>
              <th style={styles.th}>Brix</th>
              <th style={styles.th}>Alerta</th>
              <th style={styles.th}>PDF</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((insp) => {
              const tieneAlerta = parseFloat(insp.deforme || 0) > 5 || parseFloat(insp.pitting_punhead || 0) > 5;
              const pdfOk = pdfEstaOk(insp);

              return (
                <tr key={insp.id}>
                  <td style={styles.td}>
                    {insp.fecha_registro ? new Date(insp.fecha_registro).toLocaleDateString() : '--'}
                  </td>

                  <td style={styles.td}>
                    <strong>{insp.lote || '--'}</strong><br />
                    <span style={{ fontSize: 12, color: '#888' }}>{insp.productor || '--'}</span>
                  </td>

                  <td style={styles.td}>{insp.variedad || '--'}</td>
                  <td style={styles.td}>{insp.ss_promedio || '--'}°</td>

                  <td style={styles.td}>
                    <span style={styles.badge(tieneAlerta ? 'danger' : 'ok')}>
                      {tieneAlerta ? 'REVISAR' : 'OK'}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.badge(pdfOk ? 'pdfOk' : 'pdfPend')}>
                      {pdfOk ? 'PDF OK' : 'PDF PENDIENTE'}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={styles.btn('outline')} onClick={() => openModal(insp)}>
                        Editar
                      </button>

                      {!pdfOk ? (
                        <button style={styles.btn()} onClick={() => generarPDF(insp)}>
                          Generar PDF
                        </button>
                      ) : (
                        <button style={styles.btn('blue')} onClick={() => verPDF(insp)}>
                          Ver PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={7}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && selected && (
        <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar Inspección — ID {selected.id}</h3>
              <button style={styles.btn('gray')} onClick={closeModal}>Cerrar</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                {[
                  ['productor','Productor'],
                  ['lote','Lote'],
                  ['variedad','Variedad'],
                  ['calibre','Calibre'],
                  ['cod_embalaje','Cod. Embalaje'],
                  ['embalaje','Embalaje'],
                  ['fecha_embalaje','Fecha Embalaje'],
                  ['nro_frutos','N° Frutos'],
                  ['peso_neto','Peso Neto'],
                  ['ss_promedio','SS Promedio (Brix)'],
                  ['pitting_punhead','% Pitting Punhead'],
                  ['pitting_adhesion','% Pitting Adhesión'],
                  ['virosis','% Virosis'],
                  ['deforme','% Deforme'],
                  ['t_agua_diping','T° Agua Dipping'],
                  ['t_ambiente','T° Ambiente'],
                  ['t_pulpa_embalada','T° Pulpa Embalada'],
                ].map(([k,label]) => (
                  <div key={k}>
                    <label style={styles.label}>{label}</label>
                    <input
                      style={styles.field}
                      value={selected[k] || ''}
                      onChange={(e) => handleChange(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn('gray')} onClick={closeModal} disabled={saving}>Cancelar</button>
              <button style={styles.btn()} onClick={guardarEdicion} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PanelAdmin() {
  const [tab, setTab] = useState('inspecciones');

  const styles = {
    wrapper: { maxWidth: 1240, margin: '0 auto', padding: 10 },
    tabsBar: {
      display: 'flex',
      gap: 10,
      padding: 10,
      background: '#fff',
      borderRadius: 14,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      marginBottom: 14,
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap'
    },
    tabsLeft: { display: 'flex', gap: 10, alignItems: 'center' },
    tabBtn: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 12,
      cursor: 'pointer',
      border: '1px solid',
      borderColor: active ? '#2E7D32' : '#ddd',
      background: active ? '#e8f5e9' : '#fff',
      color: active ? '#2E7D32' : '#444',
      fontWeight: 'bold',
      fontSize: 13
    }),
    hint: { fontSize: 12, color: '#666' }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabsBar}>
        <div style={styles.tabsLeft}>
          <button style={styles.tabBtn(tab === 'inspecciones')} onClick={() => setTab('inspecciones')}>
            <Users size={16} style={{ display: 'none' }} />
            <ClipboardList size={16} /> Inspecciones
          </button>

          <button style={styles.tabBtn(tab === 'trabajadores')} onClick={() => setTab('trabajadores')}>
            <Users size={16} /> Trabajadores
          </button>
        </div>

        <div style={styles.hint}>
          Admin Dashboard — gestiona inspecciones y usuarios
        </div>
      </div>

      {tab === 'inspecciones' ? <InspeccionesTab /> : <PanelTrabajadores />}
    </div>
  );
}

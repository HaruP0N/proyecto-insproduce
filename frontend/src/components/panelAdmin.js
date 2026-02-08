// frontend/src/components/panelAdmin.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PanelTrabajadores from './PanelTrabajadores';
import {
  ClipboardList,
  Users,
  Eye,
  Pencil,
  Image as ImageIcon,
  X,
  Save,
  FileText
} from 'lucide-react';

// ✅ CAMBIO PRINCIPAL: API_BASE vacío para usar el proxy configurado en package.json
const API_BASE = '';

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function getMetricValue(metrics, key) {
  // metrics puede ser objeto o string JSON
  if (!metrics) return '';
  let m = metrics;
  try {
    if (typeof m === 'string') m = JSON.parse(m);
  } catch {
    return '';
  }
  const values = m?.values || {};
  return values[key] ?? '';
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '--';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function InspeccionesTab() {
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [soloPendientePDF, setSoloPendientePDF] = useState(false);

  // MODAL DETALLE
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);

  // MODAL EDITAR CABECERA
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);
  const [headerDraft, setHeaderDraft] = useState(null);
  const [savingHeader, setSavingHeader] = useState(false);

  // MODAL EDITAR METRICAS
  const [editMetricsOpen, setEditMetricsOpen] = useState(false);
  const [metricsDraft, setMetricsDraft] = useState(null);
  const [savingMetrics, setSavingMetrics] = useState(false);

  const token = localStorage.getItem('token') || '';

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
    return !!i.pdf_url;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inspecciones.filter((i) => {
      const matchText =
        !q ||
        safeStr(i.lot || i.lote).toLowerCase().includes(q) ||
        safeStr(i.producer || i.productor).toLowerCase().includes(q) ||
        safeStr(i.variety || i.variedad).toLowerCase().includes(q) ||
        safeStr(i.commodity_code).toLowerCase().includes(q);

      const matchPDF = !soloPendientePDF || !pdfEstaOk(i);
      return matchText && matchPDF;
    });
  }, [inspecciones, search, soloPendientePDF]);

  const metricas = useMemo(() => {
    const total = inspecciones.length;
    const pdfPendientes = inspecciones.filter(i => !pdfEstaOk(i)).length;

    // promedio brix usando metrics.values["general.brix"] si existe
    const brixValues = inspecciones
      .map(i => Number(String(getMetricValue(i.metrics, 'general.brix')).replace(',', '.')))
      .filter(n => Number.isFinite(n));
    const brixPromedio = brixValues.length ? (brixValues.reduce((a,b)=>a+b,0) / brixValues.length).toFixed(1) : '--';

    return { total, pdfPendientes, brixPromedio };
  }, [inspecciones]);

  const openPdf = (insp) => {
    if (!insp.pdf_url) return;
    const url = insp.pdf_url.startsWith('http')
      ? insp.pdf_url
      : `${API_BASE}${insp.pdf_url.startsWith('/') ? '' : '/'}${insp.pdf_url}`;
    window.open(url, '_blank');
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

  const openDetalle = async (insp) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setShowPhotos(false);

    try {
      const res = await axios.get(`${API_BASE}/api/inspecciones/${insp.id}`, {
        headers: { 'x-auth-token': token }
      });
      setDetail(res.data);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || err.message || 'Error al cargar detalle');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetalle = () => {
    setDetailOpen(false);
    setDetail(null);
    setShowPhotos(false);
  };

  const openEditHeader = () => {
    if (!detail) return;
    setHeaderDraft({
      productor: detail.producer || '',
      lote: detail.lot || '',
      variedad: detail.variety || '',
      calibre: detail.caliber || '',
      cod_embalaje: detail.packaging_code || '',
      embalaje: detail.packaging_type || '',
      fecha_embalaje: detail.packaging_date ? String(detail.packaging_date).slice(0, 10) : '',
    });
    setEditHeaderOpen(true);
  };

  const closeEditHeader = () => {
    setEditHeaderOpen(false);
    setHeaderDraft(null);
    setSavingHeader(false);
  };

  const saveHeader = async () => {
    if (!detail?.id) return;
    setSavingHeader(true);

    try {
      await axios.put(`${API_BASE}/api/inspecciones/${detail.id}`, {
        productor: headerDraft.productor,
        lote: headerDraft.lote,
        variedad: headerDraft.variedad,
        calibre: headerDraft.calibre,
        cod_embalaje: headerDraft.cod_embalaje,
        embalaje: headerDraft.embalaje,
        fecha_embalaje: headerDraft.fecha_embalaje,
      }, {
        headers: { 'x-auth-token': token }
      });

      // refrescar detalle + tabla
      await fetchDatos();
      await openDetalle({ id: detail.id });
      setEditHeaderOpen(false);
      alert('✅ Cabecera actualizada (PDF queda PENDING si lo manejas así en backend).');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || err.message || 'Error al guardar cabecera');
    } finally {
      setSavingHeader(false);
    }
  };

  const openEditMetrics = () => {
    if (!detail) return;

    let m = detail.metrics;
    try {
      if (typeof m === 'string') m = JSON.parse(m);
    } catch {
      m = {};
    }

    const values = m?.values || {};
    setMetricsDraft({
      template_id: m?.template_id ?? null,
      template_version: m?.template_version ?? null,
      values: { ...values }
    });
    setEditMetricsOpen(true);
  };

  const closeEditMetrics = () => {
    setEditMetricsOpen(false);
    setMetricsDraft(null);
    setSavingMetrics(false);
  };

  const updateMetric = (key, value) => {
    setMetricsDraft(prev => ({
      ...prev,
      values: { ...(prev?.values || {}), [key]: value }
    }));
  };

  const saveMetrics = async () => {
    if (!detail?.id) return;
    setSavingMetrics(true);

    try {
      // ✅ Recomendado: endpoint dedicado para métricas
      await axios.put(`${API_BASE}/api/inspecciones/${detail.id}/metrics`, {
        template_id: metricsDraft.template_id,
        template_version: metricsDraft.template_version,
        values: metricsDraft.values
      }, {
        headers: { 'x-auth-token': token }
      });

      await fetchDatos();
      await openDetalle({ id: detail.id });
      setEditMetricsOpen(false);
      alert('✅ Métricas actualizadas (PDF queda PENDING si corresponde).');
    } catch (err) {
      console.error(err);

      // si no existe el endpoint aún, te lo dirá 404
      const msg = err?.response?.data?.msg || err.message || 'Error al guardar métricas';
      alert(`❌ ${msg}\n\nSi te salió 404, falta crear el endpoint PUT /api/inspecciones/:id/metrics en backend.`);
    } finally {
      setSavingMetrics(false);
    }
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
        pdfOk: { bg: '#e8f5e9', fg: '#2E7D32' },
        pdfPend: { bg: '#fce4ec', fg: '#ad1457' },
      };
      const c = map[kind] || { bg: '#eee', fg: '#333' };
      return { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.fg };
    },

    btn: (variant) => {
      const base = {
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        border: '1px solid transparent',
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center'
      };
      if (variant === 'outline') return { ...base, background: '#fff', borderColor: '#2E7D32', color: '#2E7D32' };
      if (variant === 'blue') return { ...base, background: '#1565c0', color: '#fff' };
      if (variant === 'gray') return { ...base, background: '#607d8b', color: '#fff' };
      if (variant === 'danger') return { ...base, background: '#c62828', color: '#fff' };
      return { ...base, background: '#2E7D32', color: '#fff' };
    },

    // ✅ MODAL: chico + scroll interno + sticky header/footer
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      zIndex: 9999
    },
    modal: {
      width: '100%',
      maxWidth: 900,
      maxHeight: '85vh',
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column'
    },
    modalHeader: {
      padding: 14,
      borderBottom: '1px solid #eee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: '#fff',
      zIndex: 2
    },
    modalTitle: { margin: 0, color: '#2E7D32' },
    modalBody: { padding: 14, overflowY: 'auto', flex: 1 },
    modalFooter: {
      padding: 14,
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      flexWrap: 'wrap',
      position: 'sticky',
      bottom: 0,
      background: '#fff',
      zIndex: 2
    },

    sectionTitle: { marginTop: 10, marginBottom: 8, color: '#2E7D32', fontWeight: 900 },
    kvTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    kvTh: { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', color: '#2E7D32', fontSize: 11, textTransform: 'uppercase' },
    kvTd: { padding: 10, borderBottom: '1px solid #eee' },
    keyCode: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 },
    field: { width: '100%', padding: 10, borderRadius: 12, border: '1px solid #ddd' },
  };

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}>Cargando panel de inspecciones...</div>;
  if (errorMsg) return <div style={{ padding: 30, color: '#c62828' }}>{errorMsg}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Panel Administrativo — Inspecciones</h2>
          <p style={styles.subtitle}>Historial, detalle, fotos, edición de cabecera y métricas</p>
        </div>

        <div style={styles.filtersRow}>
          <input
            style={styles.input}
            placeholder="Buscar por lote, productor, variedad, commodity..."
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
          <div style={{ color: '#888', fontSize: 12 }}>Total inspecciones</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>Brix Promedio (metrics)</div>
          <div style={{ fontSize: 26, fontWeight: 'bold' }}>{metricas.brixPromedio === '--' ? '--' : `${metricas.brixPromedio}°`}</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: '#888', fontSize: 12 }}>PDF pendientes</div>
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
              <th style={styles.th}>Commodity</th>
              <th style={styles.th}>Lote / Productor</th>
              <th style={styles.th}>Variedad</th>
              <th style={styles.th}>Brix</th>
              <th style={styles.th}>PDF</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((insp) => {
              const pdfOk = pdfEstaOk(insp);
              const brix = getMetricValue(insp.metrics, 'general.brix');

              return (
                <tr key={insp.id}>
                  <td style={styles.td}>{formatDateDDMMYYYY(insp.created_at)}</td>

                  <td style={styles.td}>
                    <strong>{insp.commodity_code || '--'}</strong><br />
                    <span style={{ fontSize: 12, color: '#888' }}>{insp.commodity_name || ''}</span>
                  </td>

                  <td style={styles.td}>
                    <strong>{insp.lot || '--'}</strong><br />
                    <span style={{ fontSize: 12, color: '#888' }}>{insp.producer || '--'}</span>
                  </td>

                  <td style={styles.td}>{insp.variety || '--'}</td>
                  <td style={styles.td}>{safeStr(brix) ? `${brix}°` : '--'}</td>

                  <td style={styles.td}>
                    <span style={styles.badge(pdfOk ? 'pdfOk' : 'pdfPend')}>
                      {pdfOk ? 'PDF OK' : 'PDF PENDIENTE'}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={styles.btn('outline')} onClick={() => openDetalle(insp)}>
                        <Eye size={16} /> Detalle
                      </button>

                      {!pdfOk ? (
                        <button style={styles.btn()} onClick={() => generarPDF(insp)}>
                          <FileText size={16} /> Generar PDF
                        </button>
                      ) : (
                        <button style={styles.btn('blue')} onClick={() => openPdf(insp)}>
                          <FileText size={16} /> Ver PDF
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

      {/* =======================
          MODAL DETALLE
         ======================= */}
      {detailOpen && (
        <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeDetalle()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  Detalle Inspección — ID {detail?.id || ''}
                </h3>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {detail?.commodity_code ? `${detail.commodity_code} • ${detail.commodity_name || ''}` : 'Cargando...'}
                </div>
              </div>
              <button style={styles.btn('gray')} onClick={closeDetalle}>
                <X size={16} /> Cerrar
              </button>
            </div>

            <div style={styles.modalBody}>
              {detailLoading && (
                <div style={{ padding: 10 }}>Cargando detalle...</div>
              )}

              {!detailLoading && detail && (
                <>
                  {/* Barra sticky interna para acciones */}
                  <div style={{
                    marginBottom: 12,
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    position: 'sticky',
                    top: 0,
                    background: '#fff',
                    paddingBottom: 10,
                    zIndex: 1
                  }}>
                    <button style={styles.btn('outline')} onClick={() => setShowPhotos(v => !v)}>
                      <ImageIcon size={16} /> {showPhotos ? 'Ocultar fotos' : 'Ver fotos'}
                    </button>

                    <button style={styles.btn()} onClick={openEditHeader}>
                      <Pencil size={16} /> Editar cabecera
                    </button>

                    <button style={styles.btn()} onClick={openEditMetrics}>
                      <Pencil size={16} /> Editar métricas
                    </button>

                    {detail.pdf_url ? (
                      <button style={styles.btn('blue')} onClick={() => openPdf(detail)}>
                        <FileText size={16} /> Ver PDF
                      </button>
                    ) : (
                      <button style={styles.btn()} onClick={() => generarPDF(detail)}>
                        <FileText size={16} /> Generar PDF
                      </button>
                    )}
                  </div>

                  <div style={styles.sectionTitle}>Cabecera</div>
                  <table style={styles.kvTable}>
                    <thead>
                      <tr>
                        <th style={styles.kvTh}>Campo</th>
                        <th style={styles.kvTh}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Productor', detail.producer],
                        ['Lote', detail.lot],
                        ['Variedad', detail.variety],
                        ['Calibre', detail.caliber],
                        ['Código Embalaje', detail.packaging_code],
                        ['Tipo Embalaje', detail.packaging_type],
                        ['Fecha Embalaje', formatDateDDMMYYYY(detail.packaging_date)],
                      ].map(([k, v]) => (
                        <tr key={k}>
                          <td style={styles.kvTd}><strong>{k}</strong></td>
                          <td style={styles.kvTd}>{v || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={styles.sectionTitle}>Métricas (metrics.values)</div>
                  <table style={styles.kvTable}>
                    <thead>
                      <tr>
                        <th style={styles.kvTh}>Key</th>
                        <th style={styles.kvTh}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(detail.metrics?.values || {}).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ ...styles.kvTd, ...styles.keyCode }}>{k}</td>
                          <td style={styles.kvTd}>{safeStr(v)}</td>
                        </tr>
                      ))}
                      {Object.keys(detail.metrics?.values || {}).length === 0 && (
                        <tr>
                          <td style={styles.kvTd} colSpan={2}>Sin métricas registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {showPhotos && (
                    <>
                      <div style={styles.sectionTitle}>Fotos</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {(detail.fotos || []).map((f) => {
                          const url = f.url_public
                            ? `${API_BASE}${f.url_public}`
                            : `${API_BASE}/${String(f.url || '').replace(/^\//, '')}`;
                          return (
                            <a key={f.id} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                              <img
                                src={url}
                                alt="foto"
                                style={{
                                  width: 120,
                                  height: 120,
                                  objectFit: 'cover',
                                  borderRadius: 12,
                                  border: '1px solid #eee'
                                }}
                              />
                            </a>
                          );
                        })}
                        {(detail.fotos || []).length === 0 && (
                          <div style={{ color: '#666' }}>Sin fotos asociadas.</div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn('gray')} onClick={closeDetalle}>
                <X size={16} /> Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          MODAL EDITAR CABECERA
         ======================= */}
      {editHeaderOpen && headerDraft && (
        <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeEditHeader()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar cabecera — ID {detail?.id}</h3>
              <button style={styles.btn('gray')} onClick={closeEditHeader}>
                <X size={16} /> Cerrar
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {[
                  ['productor','Productor'],
                  ['lote','Lote'],
                  ['variedad','Variedad'],
                  ['calibre','Calibre'],
                  ['cod_embalaje','Cod. Embalaje'],
                  ['embalaje','Tipo Embalaje'],
                ].map(([k,label]) => (
                  <div key={k}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#555' }}>{label}</label>
                    <input
                      style={styles.field}
                      value={headerDraft[k] || ''}
                      onChange={(e) => setHeaderDraft(prev => ({ ...prev, [k]: e.target.value }))}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#555' }}>Fecha Embalaje</label>
                  <input
                    type="date"
                    style={styles.field}
                    value={headerDraft.fecha_embalaje || ''}
                    onChange={(e) => setHeaderDraft(prev => ({ ...prev, fecha_embalaje: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn('gray')} onClick={closeEditHeader} disabled={savingHeader}>
                <X size={16} /> Cancelar
              </button>
              <button style={styles.btn()} onClick={saveHeader} disabled={savingHeader}>
                <Save size={16} /> {savingHeader ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          MODAL EDITAR METRICAS
         ======================= */}
      {editMetricsOpen && metricsDraft && (
        <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeEditMetrics()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar métricas (metrics.values) — ID {detail?.id}</h3>
              <button style={styles.btn('gray')} onClick={closeEditMetrics}>
                <X size={16} /> Cerrar
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>
                Editas directamente las keys de <b>metrics.values</b>. Después guardas.
              </div>

              <table style={styles.kvTable}>
                <thead>
                  <tr>
                    <th style={styles.kvTh}>Key</th>
                    <th style={styles.kvTh}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metricsDraft.values || {}).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ ...styles.kvTd, ...styles.keyCode }}>{k}</td>
                      <td style={styles.kvTd}>
                        <input
                          style={styles.field}
                          value={safeStr(v)}
                          onChange={(e) => updateMetric(k, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}

                  {Object.keys(metricsDraft.values || {}).length === 0 && (
                    <tr>
                      <td style={styles.kvTd} colSpan={2}>No hay keys en metrics.values para editar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btn('gray')} onClick={closeEditMetrics} disabled={savingMetrics}>
                <X size={16} /> Cancelar
              </button>
              <button style={styles.btn()} onClick={saveMetrics} disabled={savingMetrics}>
                <Save size={16} /> {savingMetrics ? 'Guardando...' : 'Guardar métricas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ COMPONENTE PRINCIPAL CON EXPORT DEFAULT
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
            <ClipboardList size={16} /> Inspecciones
          </button>

          <button style={styles.tabBtn(tab === 'trabajadores')} onClick={() => setTab('trabajadores')}>
            <Users size={16} /> Trabajadores
          </button>
        </div>

        <div style={styles.hint}>Admin Dashboard — gestiona inspecciones y usuarios</div>
      </div>

      {tab === 'inspecciones' ? <InspeccionesTab /> : <PanelTrabajadores />}
    </div>
  );
}
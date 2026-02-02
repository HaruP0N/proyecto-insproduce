// frontend/src/components/EditarInspeccionModal.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000';

const EditarInspeccionModal = ({ inspectionId, templateId, closeModal }) => {
  const [inspeccion, setInspeccion] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Fetch the inspection and metrics data
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/inspecciones/${inspectionId}`, {
          headers: {
            'x-auth-token': localStorage.getItem('token'),
          },
        });
        setInspeccion(res.data);
        setMetrics(res.data.metrics || {});
      } catch (err) {
        console.error(err);
        setErrorMsg('Error al cargar la inspección');
      }
    };

    fetchData();
  }, [inspectionId]);

  const handleChange = (field, value) => {
    setMetrics((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...inspeccion,
        metrics: metrics,
      };
      await axios.put(`${API_BASE}/api/inspecciones/${inspectionId}`, payload, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      alert('✅ Cambios guardados');
      closeModal();
    } catch (err) {
      setErrorMsg('Error al guardar cambios');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!inspeccion) return <div>Cargando...</div>;

  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3>Editar Inspección — {inspeccion.lote}</h3>
          <button onClick={closeModal}>Cerrar</button>
        </div>
        <div style={styles.modalBody}>
          {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>}
          <div style={styles.modalGrid}>
            {/* Render inspection fields */}
            <div>
              <label style={styles.label}>Productor</label>
              <input
                style={styles.field}
                value={inspeccion.productor || ''}
                disabled
              />
            </div>
            <div>
              <label style={styles.label}>Lote</label>
              <input
                style={styles.field}
                value={inspeccion.lote || ''}
                disabled
              />
            </div>

            {/* Render dynamic metric fields */}
            {Object.keys(metrics.values).map((metricKey) => (
              <div key={metricKey}>
                <label style={styles.label}>{metricKey}</label>
                <input
                  style={styles.field}
                  value={metrics.values[metricKey] || ''}
                  onChange={(e) => handleChange(metricKey, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={closeModal} disabled={saving}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '80%', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' },
  modalHeader: { padding: '14px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' },
  modalBody: { padding: '14px' },
  modalFooter: { padding: '14px', display: 'flex', justifyContent: 'flex-end' },
  label: { fontWeight: 'bold', marginBottom: '6px' },
  field: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
};

export default EditarInspeccionModal;

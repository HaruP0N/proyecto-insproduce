// frontend/src/components/formularioInspeccion.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Upload, Box, Search } from 'lucide-react';

const API_BASE = 'http://localhost:4000';

const FormularioInspeccion = () => {
  const [loading, setLoading] = useState(false);

  // fotos
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  // commodities + template
  const [commodities, setCommodities] = useState([]);
  const [commodityCode, setCommodityCode] = useState('');
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({}); // key -> value

  // cabecera base (se guarda en columnas normales de inspections)
  const [header, setHeader] = useState({
    productor: '',
    lote: '',
    variedad: '',
    calibre: '',
    cod_embalaje: '',
    embalaje: '',
    fecha_embalaje: ''
  });

  const token = localStorage.getItem('token') || '';

  const axiosAuth = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      headers: { 'x-auth-token': token }
    });
  }, [token]);

  // cargar commodities
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axiosAuth.get('/api/commodities');
        setCommodities(res.data || []);
        // auto-select primero
        if (res.data?.length) {
          setCommodityCode(res.data[0].code);
        }
      } catch (e) {
        console.error(e);
        alert('No se pudieron cargar commodities (revisa token/login).');
      }
    };
    run();
  }, [axiosAuth]);

  // cargar template al cambiar commodity
  useEffect(() => {
    if (!commodityCode) return;

    const run = async () => {
      try {
        setTemplate(null);
        setFields([]);
        setValues({});

        const res = await axiosAuth.get(`/api/commodities/${commodityCode}/template`);
        setTemplate(res.data.template);
        setFields(res.data.fields || []);

        // inicializar values vacíos
        const init = {};
        (res.data.fields || []).forEach(f => { init[f.key] = ''; });
        setValues(init);
      } catch (e) {
        console.error(e);
        alert(`No se pudo cargar la template ${commodityCode}`);
      }
    };

    run();
  }, [commodityCode, axiosAuth]);

  const handleHeader = (e) => {
    const { name, value } = e.target;
    setHeader(prev => ({ ...prev, [name]: value }));
  };

  const handleField = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const renderInput = (f) => {
    const v = values[f.key] ?? '';

    // select
    if (f.field_type === 'select') {
      return (
        <select
          value={v}
          onChange={(e) => handleField(f.key, e.target.value)}
          style={styles.input}
          required={!!f.required}
        >
          <option value="">-- Seleccionar --</option>
          {(f.options || []).map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      );
    }

    // number
    if (f.field_type === 'number') {
      return (
        <input
          type="number"
          value={v}
          onChange={(e) => handleField(f.key, e.target.value)}
          style={styles.input}
          min={f.min_value ?? undefined}
          max={f.max_value ?? undefined}
          step="0.01"
          required={!!f.required}
        />
      );
    }

    // text
    return (
      <input
        type="text"
        value={v}
        onChange={(e) => handleField(f.key, e.target.value)}
        style={styles.input}
        required={!!f.required}
      />
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commodityCode) return alert('Selecciona commodity');

    if (!template?.id || !template?.version) {
      return alert('Template inválida. Revisa backend.');
    }

    setLoading(true);

    try {
      const data = new FormData();

      // header (columnas)
      Object.keys(header).forEach(k => data.append(k, header[k]));

      // commodity
      data.append('commodity', commodityCode);

      // metrics dinámico
      const metrics = {
        template_id: template.id,
        template_version: template.version,
        values: values
      };
      data.append('metrics', JSON.stringify(metrics));

      // fotos
      fotos.forEach((foto) => data.append('imagenes', foto)); // compat

      const res = await axios.post(`${API_BASE}/api/inspecciones`, data, {
        headers: { 'x-auth-token': token }
      });

      if (res.data?.success) {
        alert(`✓ Inspección guardada. PDF quedó en estado: ${res.data.pdf_status || 'PENDING'}`);
      } else {
        alert('✗ No se pudo guardar la inspección.');
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || '✗ Error al guardar inspección.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerBar}>
          <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '0.5px' }}>
            INSPRODUCE INSPECTION SYSTEM
          </h1>
          <p style={{ margin: '6px 0 0', opacity: 0.9 }}>
            Berries — Inspección de Calidad
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* commodity */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Search size={18} /> Selección de Producto
            </div>

            <label style={styles.label}>Commodity</label>
            <select
              value={commodityCode}
              onChange={(e) => setCommodityCode(e.target.value)}
              style={styles.input}
              required
            >
              {commodities.map(c => (
                <option key={c.id} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              Template: <strong>{template ? `${template.name} (v${template.version})` : '—'}</strong>
            </div>
          </div>

          {/* header */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Box size={18} /> Identificación del Lote
            </div>

            <div style={styles.grid}>
              {[
                ['productor','Productor', true],
                ['lote','Lote / Serie', true],
                ['variedad','Variedad', false],
                ['calibre','Calibre', false],
                ['cod_embalaje','Cod. Embalaje', false],
                ['embalaje','Tipo Embalaje', false],
                ['fecha_embalaje','Fecha Embalaje', false],
              ].map(([k, label, req]) => (
                <div key={k}>
                  <label style={styles.label}>{label}</label>
                  <input
                    type={k === 'fecha_embalaje' ? 'date' : 'text'}
                    name={k}
                    value={header[k]}
                    onChange={handleHeader}
                    style={styles.input}
                    required={!!req}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* template fields */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Search size={18} /> Parámetros (Template)
            </div>

            <div style={styles.grid}>
              {fields.map((f) => (
                <div key={f.key}>
                  <label style={styles.label}>
                    {f.label}{f.unit ? ` (${f.unit})` : ''}{f.required ? ' *' : ''}
                  </label>
                  {renderInput(f)}
                </div>
              ))}
            </div>
          </div>

          {/* fotos */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Upload size={18} /> Evidencia (Fotos)
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="preview"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #ddd'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ padding: '0 22px 22px' }}>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'GUARDANDO...' : 'GUARDAR INSPECCIÓN (PDF PENDIENTE)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f7f4',
    padding: 20,
    fontFamily: 'Segoe UI, Roboto, sans-serif'
  },
  card: {
    maxWidth: 1100,
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  headerBar: {
    backgroundColor: '#2E7D32',
    color: '#fff',
    padding: 24,
    textAlign: 'center',
    borderBottom: '6px solid #FFB300'
  },
  section: {
    padding: 22,
    borderBottom: '1px solid #eee'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#2E7D32',
    marginBottom: 14,
    fontSize: '1.05rem',
    fontWeight: 'bold'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    fontSize: 14,
    outlineColor: '#4CAF50'
  },
  button: {
    width: '100%',
    padding: 16,
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default FormularioInspeccion;

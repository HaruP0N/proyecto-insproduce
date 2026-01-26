import React, { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../utils/api';
import { Search, PlusCircle, RefreshCw, KeyRound, UserCog } from 'lucide-react';

const PanelTrabajadores = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('activos'); // activos | inactivos | todos

  // modal form
  const [modalOpen, setModalOpen] = useState(false);
  const [modo, setModo] = useState('crear'); // crear | editar
  const [form, setForm] = useState({ id: null, nombre: '', email: '', rol: 'inspector', activo: true, password: '' });

  // password temporal mostrado
  const [tempPass, setTempPass] = useState(null);

  const miUserEmail = useMemo(() => localStorage.getItem('user_email') || '', []);

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      console.error(err);
      alert('Error cargando usuarios (¿estás logueado como admin?)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();

    return usuarios.filter((u) => {
      const pasaTexto =
        !term ||
        String(u.nombre || '').toLowerCase().includes(term) ||
        String(u.email || '').toLowerCase().includes(term);

      const pasaEstado =
        estado === 'todos' ? true :
        estado === 'activos' ? u.activo === true :
        u.activo === false;

      return pasaTexto && pasaEstado;
    });
  }, [usuarios, q, estado]);

  const metricas = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [usuarios]);

  const abrirCrear = () => {
    setModo('crear');
    setForm({ id: null, nombre: '', email: '', rol: 'inspector', activo: true, password: '' });
    setModalOpen(true);
  };

  const abrirEditar = (u) => {
    setModo('editar');
    setForm({ id: u.id, nombre: u.nombre || '', email: u.email || '', rol: u.rol || 'inspector', activo: !!u.activo, password: '' });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        activo: form.activo
      };

      // solo enviar password si la escribieron
      if (form.password && form.password.trim().length > 0) payload.password = form.password.trim();

      if (modo === 'crear') {
        if (!payload.password) {
          alert('Para crear, debes ingresar una contraseña.');
          return;
        }
        await api.post('/usuarios', payload);
      } else {
        await api.put(`/usuarios/${form.id}`, payload);
      }

      setModalOpen(false);
      await fetchUsuarios();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || 'Error guardando usuario');
    }
  };

  const toggleActivo = async (u) => {
    // (opcional) evitar que el admin se desactive a sí mismo por accidente
    if (miUserEmail && String(u.email || '').toLowerCase() === String(miUserEmail).toLowerCase()) {
      const ok = window.confirm('Ojo: este parece ser tu propio usuario. ¿Seguro que quieres cambiar su estado?');
      if (!ok) return;
    }

    const accion = u.activo ? 'desactivar' : 'reactivar';
    const ok = window.confirm(`¿Seguro que deseas ${accion} a ${u.nombre} (${u.email})?`);
    if (!ok) return;

    try {
      await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
      await fetchUsuarios();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || 'Error cambiando estado');
    }
  };

  const resetPassword = async (u) => {
    const ok = window.confirm(`¿Resetear contraseña de ${u.nombre} (${u.email})?\n\nSe generará una temporal y se mostrará una sola vez.`);
    if (!ok) return;

    try {
      const res = await api.post(`/usuarios/${u.id}/reset-password`, {});
      const temporal = res.data?.tempPassword;

      if (temporal) {
        setTempPass({ usuario: u, pass: temporal });
      } else {
        alert('Password reseteada. (No se devolvió temporal porque no se generó automáticamente)');
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.msg || 'Error reseteando password');
    }
  };

  const styles = {
    page: { padding: 24, maxWidth: 1200, margin: '0 auto' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    h1: { margin: 0, color: '#1b5e20' },
    subtitle: { marginTop: 6, color: '#666' },
    controls: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    inputWrap: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', background: '#fff' },
    input: { border: 'none', outline: 'none', width: 260 },
    select: { border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', background: '#fff' },
    btn: (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }),
    btnOutline: { background: '#fff', border: '1px solid #1b5e20', color: '#1b5e20', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 },
    card: { background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
    tableWrap: { marginTop: 18, background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' },
    tableHead: { padding: 14, borderBottom: '1px solid #eee', fontWeight: 800, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: 10 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', fontSize: 12, color: '#1b5e20', padding: 14, background: '#fafafa', borderBottom: '1px solid #eee' },
    td: { padding: 14, borderBottom: '1px solid #f0f0f0' },
    badge: (ok) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: ok ? '#e8f5e9' : '#ffebee', color: ok ? '#1b5e20' : '#b71c1c' }),
    btnSmall: (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, marginRight: 8 }),
    modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 },
    modal: { width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' },
    modalTitle: { margin: 0, color: '#1b5e20' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 800, color: '#444' },
    input2: { border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px' },
    row: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.h1}>Trabajadores (Usuarios)</h2>
          <div style={styles.subtitle}>Crear, editar, desactivar/reactivar y resetear password</div>
        </div>

        <div style={styles.controls}>
          <div style={styles.inputWrap}>
            <Search size={18} />
            <input
              style={styles.input}
              placeholder="Buscar por nombre o email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select style={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>

          <button style={styles.btnOutline} onClick={fetchUsuarios}>
            <RefreshCw size={18} /> Refrescar
          </button>

          <button style={styles.btn('#1b5e20')} onClick={abrirCrear}>
            <PlusCircle size={18} /> Crear Usuario
          </button>
        </div>
      </div>

      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={{ color: '#666', fontSize: 12 }}>Total Usuarios</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{metricas.total}</div>
        </div>
        <div style={styles.card}>
          <div style={{ color: '#666', fontSize: 12 }}>Activos</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{metricas.activos}</div>
        </div>
        <div style={styles.card}>
          <div style={{ color: '#666', fontSize: 12 }}>Inactivos</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{metricas.inactivos}</div>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <div style={styles.tableHead}>
          <UserCog size={18} />
          Gestión de Usuarios
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>Cargando...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>NOMBRE</th>
                <th style={styles.th}>EMAIL</th>
                <th style={styles.th}>ROL</th>
                <th style={styles.th}>ESTADO</th>
                <th style={styles.th}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id}>
                  <td style={styles.td}><b>{u.nombre}</b></td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{String(u.rol || '').toUpperCase()}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(u.activo)}>{u.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.btnSmall('#1565c0')} onClick={() => abrirEditar(u)}>Editar</button>
                    <button style={styles.btnSmall('#1b5e20')} onClick={() => resetPassword(u)}>
                      <KeyRound size={14} style={{ marginRight: 6 }} />
                      Reset Password
                    </button>
                    <button
                      style={styles.btnSmall(u.activo ? '#c62828' : '#2e7d32')}
                      onClick={() => toggleActivo(u)}
                    >
                      {u.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={5}>Sin resultados.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{modo === 'crear' ? 'Crear Usuario' : 'Editar Usuario'}</h3>

            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.label}>Nombre</div>
                <input style={styles.input2} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Email</div>
                <input style={styles.input2} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Rol</div>
                <select style={styles.input2} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  <option value="inspector">inspector</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Estado</div>
                <select
                  style={styles.input2}
                  value={form.activo ? 'activo' : 'inactivo'}
                  onChange={(e) => setForm({ ...form, activo: e.target.value === 'activo' })}
                >
                  <option value="activo">activo</option>
                  <option value="inactivo">inactivo</option>
                </select>
              </div>

              <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <div style={styles.label}>
                  Password {modo === 'editar' ? '(opcional, solo si quieres cambiarla)' : '(obligatoria)'}
                </div>
                <input
                  style={styles.input2}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div style={styles.row}>
              <button style={styles.btnOutline} onClick={() => setModalOpen(false)}>Cancelar</button>
              <button style={styles.btn('#1b5e20')} onClick={guardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Password temporal */}
      {tempPass && (
        <div style={styles.modalBackdrop} onClick={() => setTempPass(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Password temporal generada</h3>
            <p style={{ color: '#555' }}>
              Usuario: <b>{tempPass.usuario.nombre}</b> ({tempPass.usuario.email})
            </p>
            <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 10, fontWeight: 900, letterSpacing: 1 }}>
              {tempPass.pass}
            </div>
            <p style={{ color: '#777', marginTop: 10, fontSize: 12 }}>
              Copia esto ahora. Se muestra una sola vez.
            </p>

            <div style={styles.row}>
              <button style={styles.btn('#1b5e20')} onClick={() => setTempPass(null)}>Listo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelTrabajadores;

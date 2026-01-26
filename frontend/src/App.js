// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import FormularioInspeccion from './components/formularioInspeccion';
import PanelAdmin from './components/panelAdmin';

// Decodifica JWT (Base64URL) y extrae rol de forma robusta
const decodeTokenRole = (token) => {
  try {
    if (!token || typeof token !== 'string') return '';

    const parts = token.split('.');
    if (parts.length < 2) return '';

    const payload = parts[1];

    // Base64URL -> Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    const decoded = JSON.parse(atob(padded));

    // soporta role o rol
    return String(decoded.role || decoded.rol || '').toLowerCase().trim();
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return '';
  }
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [rol, setRol] = useState(() => decodeTokenRole(localStorage.getItem('token') || ''));

  useEffect(() => {
    // sincroniza al montar (por si se actualizó localStorage)
    const savedToken = localStorage.getItem('token') || '';
    setToken(savedToken);
    setRol(decodeTokenRole(savedToken));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('user_email');

    setToken('');
    setRol('');
  };

  // data puede venir como { token, role } o { token, rol }
  const handleLoginSuccess = (data) => {
    const tokenRecibido = data?.token || '';
    const roleFromResponse = data?.role || data?.rol || '';
    const roleFromToken = decodeTokenRole(tokenRecibido);

    const rolFinal = String(roleFromResponse || roleFromToken).toLowerCase().trim();

    localStorage.setItem('token', tokenRecibido);
    localStorage.setItem('rol', rolFinal);

    // si el backend manda user.email lo guardamos opcionalmente
    if (data?.user?.email) localStorage.setItem('user_email', data.user.email);

    setToken(tokenRecibido);
    setRol(rolFinal);
  };

  const styles = {
    header: {
      backgroundColor: '#fff',
      padding: '20px',
      borderBottom: '2px solid #FFB300',
      marginBottom: '30px'
    },
    title: {
      color: '#2E7D32',
      margin: 0,
      fontSize: '24px'
    },
    logoutBtn: {
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: 'bold',
      float: 'right',
      marginRight: '20px'
    },
    rolePill: {
      display: 'inline-block',
      marginTop: 8,
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 'bold',
      background: rol === 'admin' ? '#e8f5e9' : '#e3f2fd',
      color: rol === 'admin' ? '#2E7D32' : '#1565c0'
    }
  };

  const isLoggedIn = !!token;

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f4f7f4', minHeight: '100vh' }}>
      <header style={styles.header}>
        {isLoggedIn && (
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar Sesión
          </button>
        )}

        <h1 style={styles.title}>Insproduce QC - Temporada 2025-2026</h1>

        {isLoggedIn && rol && (
          <span style={styles.rolePill}>
            Rol: {rol.toUpperCase()}
          </span>
        )}
      </header>

      <main
        style={
          !isLoggedIn
            ? {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '70vh'
              }
            : { padding: '0 20px' }
        }
      >
        {!isLoggedIn ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : rol === 'admin' ? (
          <PanelAdmin />
        ) : (
          <FormularioInspeccion />
        )}
      </main>
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import Login from './components/Login';
import FormularioInspeccion from './components/formularioInspeccion';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  // Estilos para mantener la coherencia con Insproduce
  const styles = {
    header: { 
      backgroundColor: '#fff', 
      padding: '20px', 
      borderBottom: '2px solid #FFB300', 
      marginBottom: '30px' 
    },
    title: { 
      color: '#2E7D32', // Verde Insproduce
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
    }
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f4f7f4', minHeight: '100vh' }}>
      <header style={styles.header}>
        {isLoggedIn && (
          <button 
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('rol'); setIsLoggedIn(false); }} 
            style={styles.logoutBtn}
          >
            Cerrar Sesión
          </button>
        )}
        <h1 style={styles.title}>Insproduce QC - Temporada 2025-2026</h1>
      </header>

      <main style={{ padding: '0 20px' }}>
        {!isLoggedIn ? (
          <Login onLoginSuccess={() => setIsLoggedIn(true)} />
        ) : (
          <FormularioInspeccion />
        )}
      </main>
    </div>
  );
}

export default App;
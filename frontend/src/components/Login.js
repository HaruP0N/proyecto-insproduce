// frontend/src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();

    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', {
        email: emailTrimmed,
        password: passwordTrimmed
      });

      // backend responde: { token, role, user: {...} }
      const token = response.data.token;
      const role = response.data.role;

      // Le avisamos al App para que rendee correctamente
      onLoginSuccess({ token, role });

    } catch (err) {
      console.error("Error de autenticación:", err);
      const msg = err?.response?.data?.msg || 'Credenciales incorrectas.';
      alert(msg);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100" style={{ height: '70vh' }}>
      <form onSubmit={handleSubmit} className="p-8 bg-white shadow-lg rounded-lg w-96"
        style={{ padding: 32, background: '#fff', borderRadius: 14, width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center', color: '#2E7D32' }}>
          INSPRODUCE QC
        </h2>

        <input
          type="email"
          placeholder="Email"
          style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          style={{ width: '100%', marginBottom: 18, padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          style={{ width: '100%', background: '#2E7D32', color: '#fff', padding: 12, borderRadius: 10, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
};

export default Login;

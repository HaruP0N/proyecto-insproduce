import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificamos que no haya espacios extra antes de enviar las credenciales
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();

    // Log para verificar los datos que se están enviando
    console.log("Email enviado:", emailTrimmed);  // Verifica el email
    console.log("Password enviada:", passwordTrimmed);  // Verifica la contraseña

    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', { email: emailTrimmed, password: passwordTrimmed });

      // Log para verificar la respuesta que llega del backend
      console.log("Respuesta del backend:", response.data);

      // Guardamos el token y el rol en localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('rol', response.data.rol);

      // Avisamos a App.js que el login fue exitoso
      onLogin(response.data);
    } catch (err) {
      console.error("Error de autenticación:", err);  // Muestra el error completo
      alert("Credenciales incorrectas.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="p-8 bg-white shadow-lg rounded-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-red-700">SUBSOLE QC</h2>
        <input 
          type="email" placeholder="Email" 
          className="w-full mb-4 p-2 border rounded"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="Contraseña" 
          className="w-full mb-6 p-2 border rounded"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700">
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
};

export default Login;

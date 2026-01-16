import React, { useState } from 'react';
import axios from 'axios';
import { Leaf, Lock, User } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [credenciales, setCredenciales] = useState({ email: '', password: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:4000/api/auth/login', credenciales);
            
            // GUARDAMOS EN LOCALSTORAGE
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('rol', res.data.rol);
            
            console.log("LOGIN EXITOSO. ROL RECIBIDO:", res.data.rol);

            // AVISAMOS A APP.JS
            onLoginSuccess();
            
        } catch (err) {
            alert("Error: Credenciales incorrectas");
        }
    };

    return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <div style={{ backgroundColor: '#4CAF50', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Leaf color="#fff" size={30} />
                </div>
                <h2 style={{ color: '#2E7D32' }}>Insproduce</h2>
                <form onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        placeholder="Email" 
                        style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        onChange={(e) => setCredenciales({...credenciales, email: e.target.value})} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }}
                        onChange={(e) => setCredenciales({...credenciales, password: e.target.value})} 
                        required 
                    />
                    <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#2E7D32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ENTRAR
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
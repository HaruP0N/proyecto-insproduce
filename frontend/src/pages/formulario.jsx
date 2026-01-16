import React, { useState } from 'react';

const Formulario = () => {
  const [datos, setDatos] = useState({
    lote: '', variedad: 'SANTINA', calibre: '3JD', pitting: 0, deforme: 0, fotos: {}
  });

  const handleFile = (e, campo) => {
    setDatos({...datos, fotos: { ...datos.fotos, [campo]: e.target.files[0] }});
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Nueva Inspección QC - Temporada 2025-2026 [cite: 13]</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input type="text" placeholder="Productor (ej: 0179)" className="border p-2" />
        <input type="text" placeholder="Lote (ej: 18)" className="border p-2" />
        <select className="border p-2">
          <option>SANTINA</option>
          <option>LAPINS</option>
        </select>
        <input type="text" placeholder="Calibre (ej: 3JD)" className="border p-2" />
      </div>

      <h3 className="font-bold border-b mb-4">Defectos y Evidencia</h3>
      <div className="space-y-4">
        {['Pitting Punteadura', 'Virosis', 'Deforme'].map(defecto => (
          <div key={defecto} className="flex items-center justify-between bg-gray-50 p-3 rounded">
            <span>{defecto}</span>
            <div className="flex gap-2">
              <input type="number" placeholder="%" className="w-20 border p-1" />
              <input type="file" onChange={(e) => handleFile(e, defecto)} className="text-sm" />
            </div>
          </div>
        ))}
      </div>

      <button className="mt-8 bg-green-600 text-white px-6 py-2 rounded">Finalizar Inspección</button>
    </div>
  );
};

export default Formulario;
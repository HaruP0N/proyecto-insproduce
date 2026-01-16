import React from 'react';

const Dashboard = () => {
  const lotes = [
    { id: 1, lote: "18", productor: "AGRICOLA EL RESGUARDO", variedad: "SANTINA", nota: 4 },
    { id: 2, lote: "19", productor: "PRODUCTOR X", variedad: "SANTINA", nota: 2 },
  ];

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control QC</h1>
        <div className="text-right text-sm text-gray-500">Temporada 2025-2026 [cite: 13]</div>
      </header>

      <table className="w-full bg-white shadow-md rounded">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-3 text-left">Lote</th>
            <th className="p-3 text-left">Productor</th>
            <th className="p-3 text-left">Variedad</th>
            <th className="p-3 text-left">Estado (Nota)</th>
            <th className="p-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map(l => (
            <tr key={l.id} className="border-b">
              <td className="p-3">{l.lote}</td>
              <td className="p-3">{l.productor}</td>
              <td className="p-3">{l.variedad}</td>
              <td className="p-3 font-bold text-red-600">Nota {l.nota}</td>
              <td className="p-3 text-center">
                <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm mr-2">Ver PDF</button>
                <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
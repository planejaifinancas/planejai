
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Gasto, Categoria } from '../types';
import { CATEGORIA_COLORS } from '../constants';

interface Props {
  gastos: Gasto[];
}

const CategoryChart: React.FC<Props> = ({ gastos }) => {
  const dataMap = gastos.reduce((acc, current) => {
    const cat = current.categoria;
    acc[cat] = (acc[cat] || 0) + current.valor;
    return acc;
  }, {} as Record<string, number>);

  // Fix: Explicitly cast Object.entries to ensure 'value' is treated as a number
  // this prevents the 'unknown' error on line 20 during the sort operation.
  const data = (Object.entries(dataMap) as [string, number][]).map(([name, value]) => ({
    name,
    value: Math.max(0, value) // ignore negative for pie chart
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 italic">
        Sem dados para exibir o gráfico
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORIA_COLORS[entry.name as Categoria] || '#cbd5e1'} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;

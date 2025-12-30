"use client";

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StoreProfile } from '../../types';

interface SalesChartsProps {
  storePrimaryColor: string;
  weeklySalesData: { name: string; sales: number }[];
  monthlySalesData: { name: string; sales: number }[];
}

export const SalesCharts: React.FC<SalesChartsProps> = ({ storePrimaryColor, weeklySalesData, monthlySalesData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Vendas Semanais */}
      <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas Semanais</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklySalesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              labelFormatter={(label: string) => `Dia: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#333', fontWeight: 'bold' }}
              itemStyle={{ color: storePrimaryColor }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line type="monotone" dataKey="sales" stroke={storePrimaryColor} strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8, strokeWidth: 2, stroke: storePrimaryColor }} name="Vendas" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Vendas Mensais */}
      <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Vendas Mensais</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlySalesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              labelFormatter={(label: string) => `Mês: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#333', fontWeight: 'bold' }}
              itemStyle={{ color: storePrimaryColor }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="sales" fill={storePrimaryColor} name="Vendas" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
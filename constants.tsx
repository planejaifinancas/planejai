
import React from 'react';
import { Categoria } from './types';
import { 
  Home, 
  Utensils, 
  Car, 
  HeartPulse, 
  GraduationCap, 
  Palmtree, 
  ShoppingBag, 
  TrendingUp,
  Banknote,
  Key,
  PieChart,
  PlusCircle
} from 'lucide-react';

export const CATEGORIAS_DESPESA = [
  Categoria.CASA,
  Categoria.ALIMENTACAO,
  Categoria.TRANSPORTE,
  Categoria.SAUDE,
  Categoria.EDUCACAO,
  Categoria.LAZER,
  Categoria.PESSOAIS,
  Categoria.INVESTIMENTOS
];

export const CATEGORIAS_RECEITA = [
  Categoria.SALARIOS,
  Categoria.ALUGUEIS,
  Categoria.DIVIDENDOS,
  Categoria.OUTROS_RECEITA
];

export const CATEGORIAS_LIST = Object.values(Categoria);

export const CATEGORIA_ICONS: Record<Categoria, React.ReactNode> = {
  [Categoria.CASA]: <Home className="w-5 h-5" />,
  [Categoria.ALIMENTACAO]: <Utensils className="w-5 h-5" />,
  [Categoria.TRANSPORTE]: <Car className="w-5 h-5" />,
  [Categoria.SAUDE]: <HeartPulse className="w-5 h-5" />,
  [Categoria.EDUCACAO]: <GraduationCap className="w-5 h-5" />,
  [Categoria.LAZER]: <Palmtree className="w-5 h-5" />,
  [Categoria.PESSOAIS]: <ShoppingBag className="w-5 h-5" />,
  [Categoria.INVESTIMENTOS]: <TrendingUp className="w-5 h-5" />,
  [Categoria.SALARIOS]: <Banknote className="w-5 h-5" />,
  [Categoria.ALUGUEIS]: <Key className="w-5 h-5" />,
  [Categoria.DIVIDENDOS]: <PieChart className="w-5 h-5" />,
  [Categoria.OUTROS_RECEITA]: <PlusCircle className="w-5 h-5" />
};

export const CATEGORIA_COLORS: Record<Categoria, string> = {
  [Categoria.CASA]: '#3b82f6', // blue-500
  [Categoria.ALIMENTACAO]: '#f59e0b', // amber-500
  [Categoria.TRANSPORTE]: '#10b981', // emerald-500
  [Categoria.SAUDE]: '#ef4444', // red-500
  [Categoria.EDUCACAO]: '#8b5cf6', // violet-500
  [Categoria.LAZER]: '#ec4899', // pink-500
  [Categoria.PESSOAIS]: '#6b7280', // gray-500
  [Categoria.INVESTIMENTOS]: '#06b6d4', // cyan-500
  [Categoria.SALARIOS]: '#16a34a', // green-600
  [Categoria.ALUGUEIS]: '#059669', // emerald-600
  [Categoria.DIVIDENDOS]: '#22c55e', // green-500
  [Categoria.OUTROS_RECEITA]: '#4ade80' // green-400
};

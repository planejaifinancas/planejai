
import React, { useState, useEffect } from 'react';
import { Gasto, Categoria, TipoTransacao } from '../types';
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from '../constants';
import { X, TrendingDown, TrendingUp, CalendarCheck } from 'lucide-react';

interface Props {
  onSave: (gasto: Omit<Gasto, 'id' | 'origem' | 'fonteArquivo' | 'confiancaCategoria'>, syncToCalendar: boolean) => void;
  onCancel: () => void;
  initialData?: Gasto;
}

const TransactionForm: React.FC<Props> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    tipo: 'despesa' as TipoTransacao,
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    local: '',
    valor: '',
    categoria: Categoria.PESSOAIS,
    parcelado: false,
    recorrente: false,
    vincularAgenda: false,
    numeroParcela: '1',
    totalParcelas: '1'
  });

  // Preencher formulário se for edição
  useEffect(() => {
    if (initialData) {
      setFormData({
        tipo: initialData.tipo || 'despesa',
        descricao: initialData.descricao || '',
        data: initialData.data,
        local: initialData.local || '',
        valor: initialData.valor.toString(),
        categoria: initialData.categoria,
        parcelado: initialData.parcelado,
        recorrente: initialData.recorrente || false,
        vincularAgenda: false, // Por padrão, não sincronizar novamente em edições
        numeroParcela: initialData.numeroParcela?.toString() || '1',
        totalParcelas: initialData.totalParcelas?.toString() || '1'
      });
    }
  }, [initialData]);

  // Atualizar categoria padrão ao trocar tipo
  useEffect(() => {
    if (!initialData) {
      if (formData.tipo === 'despesa') {
        setFormData(prev => ({ ...prev, categoria: Categoria.PESSOAIS }));
      } else {
        setFormData(prev => ({ ...prev, categoria: Categoria.SALARIOS }));
      }
    }
  }, [formData.tipo, initialData]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.data) newErrors.data = 'Data é obrigatória';
    if (!formData.valor || isNaN(parseFloat(formData.valor))) newErrors.valor = 'Valor inválido';
    if (!formData.categoria) newErrors.categoria = 'Categoria é obrigatória';
    
    if (formData.tipo === 'despesa' && formData.parcelado) {
      const n = parseInt(formData.numeroParcela);
      const t = parseInt(formData.totalParcelas);
      if (isNaN(n)) newErrors.numeroParcela = 'Obrigatório';
      if (isNaN(t)) newErrors.totalParcelas = 'Obrigatório';
      if (n > t) newErrors.numeroParcela = 'Parcela atual não pode ser maior que o total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        tipo: formData.tipo,
        descricao: formData.descricao,
        data: formData.data,
        local: formData.local,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria,
        parcelado: formData.tipo === 'despesa' ? formData.parcelado : false,
        recorrente: formData.recorrente,
        numeroParcela: (formData.tipo === 'despesa' && formData.parcelado) ? parseInt(formData.numeroParcela) : null,
        totalParcelas: (formData.tipo === 'despesa' && formData.parcelado) ? parseInt(formData.totalParcelas) : null,
      }, formData.vincularAgenda);
    }
  };

  const currentCategories = formData.tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Editar Transação' : `Nova ${formData.tipo === 'receita' ? 'Receita' : 'Despesa'}`}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seletor de Tipo */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, tipo: 'despesa' }))}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                formData.tipo === 'despesa' 
                ? 'bg-white text-red-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, tipo: 'receita' }))}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                formData.tipo === 'receita' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Receita</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Descrição</label>
              <input 
                type="text" 
                value={formData.descricao}
                onChange={e => setFormData(prev => ({...prev, descricao: e.target.value}))}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium" 
                placeholder="Ex: Aluguel, Salário, Uber..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Data*</label>
              <input 
                type="date" 
                value={formData.data}
                onChange={e => setFormData(prev => ({...prev, data: e.target.value}))}
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 font-medium ${errors.data ? 'border-red-500' : 'focus:ring-2 focus:ring-blue-500'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Valor (R$)*</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.valor}
                onChange={e => setFormData(prev => ({...prev, valor: e.target.value}))}
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 font-bold ${errors.valor ? 'border-red-500' : 'focus:ring-2 focus:ring-blue-500'}`}
                placeholder="0,00"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Categoria*</label>
              <select 
                value={formData.categoria}
                onChange={e => setFormData(prev => ({...prev, categoria: e.target.value as Categoria}))}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 font-medium"
              >
                {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-3 py-2 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="recorrente"
                    checked={formData.recorrente}
                    onChange={e => setFormData(prev => ({...prev, recorrente: e.target.checked}))}
                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="recorrente" className="text-sm font-bold text-slate-700 cursor-pointer">Recorrência Mensal</label>
                </div>

                {formData.tipo === 'despesa' && (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="parcelado"
                      checked={formData.parcelado}
                      onChange={e => setFormData(prev => ({...prev, parcelado: e.target.checked}))}
                      className="w-5 h-5 text-slate-600 rounded-lg focus:ring-slate-500 cursor-pointer"
                    />
                    <label htmlFor="parcelado" className="text-sm font-bold text-slate-700 cursor-pointer">Parcelado?</label>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <input 
                  type="checkbox" 
                  id="vincularAgenda"
                  checked={formData.vincularAgenda}
                  onChange={e => setFormData(prev => ({...prev, vincularAgenda: e.target.checked}))}
                  className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="vincularAgenda" className="text-sm font-bold text-emerald-700 cursor-pointer flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4" /> Vincular ao Google Agenda
                </label>
              </div>
            </div>

            {formData.tipo === 'despesa' && formData.parcelado && (
              <div className="col-span-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Parcela Atual</label>
                  <input 
                    type="number" 
                    value={formData.numeroParcela}
                    onChange={e => setFormData(prev => ({...prev, numeroParcela: e.target.value}))}
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Total</label>
                  <input 
                    type="number" 
                    value={formData.totalParcelas}
                    onChange={e => setFormData(prev => ({...prev, totalParcelas: e.target.value}))}
                    className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex space-x-3">
            <button 
              type="button" 
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={`flex-1 px-4 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${
                formData.tipo === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              Salvar {formData.tipo === 'receita' ? 'Receita' : 'Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;

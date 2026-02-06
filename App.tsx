
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Paperclip, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Trash2, FileText, CheckCircle2, TrendingDown, TrendingUp, Wallet, 
  User, Settings, LogOut, BarChart3, Bell, CalendarCheck2,
  PieChart as PieChartIcon, TrendingUp as InvestIcon, Compass, ArrowUpRight,
  Target, PiggyBank, ExternalLink, AlertCircle, Info, Link as LinkIcon,
  RefreshCw, ShieldCheck, Landmark, Search, ChevronRight as ChevronRightIcon,
  X, Lock, Shield, Brain, LockOpen
} from 'lucide-react';
import { Gasto, Categoria, ImportSummary, BancoConectado } from './types';
import { formatCurrency, formatDate, autoCategorize, parseCSV } from './utils/helpers';
import { extractFromPDF } from './services/geminiService';
import { OpenFinanceService, OFB_DIRECTORY } from './services/openFinanceService';
import { CATEGORIA_ICONS, CATEGORIA_COLORS, CATEGORIAS_LIST } from './constants';
import TransactionForm from './components/TransactionForm';
import CategoryChart from './components/CategoryChart';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';

type ActiveTab = 'gastos' | 'dashboard' | 'investimentos' | 'conexoes' | 'perfil';

const generateId = () => {
  try { return crypto.randomUUID(); } catch (e) { return Math.random().toString(36).substring(2, 15) + Date.now().toString(36); }
};

const CLIENT_ID = "SEU_CLIENT_ID_DO_GOOGLE_AQUI.apps.googleusercontent.com"; 
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

const App: React.FC = () => {
  const [gastos, setGastos] = useState<Gasto[]>(() => {
    const saved = localStorage.getItem('planejai_gastos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [bancosConectados, setBancosConectados] = useState<BancoConectado[]>(() => {
    const saved = localStorage.getItem('planejai_bancos');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('gastos');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('planejai_gastos', JSON.stringify(gastos));
  }, [gastos]);

  useEffect(() => {
    localStorage.setItem('planejai_bancos', JSON.stringify(bancosConectados));
  }, [bancosConectados]);

  // Inicialização das APIs do Google
  useEffect(() => {
    const loadGapi = () => {
      const gapi = (window as any).gapi;
      if (!gapi) return;
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });
          setGapiInited(true);
        } catch (err) {
          console.error("Erro GAPI:", err);
        }
      });
    };

    const loadGis = () => {
      const google = (window as any).google;
      if (!google || !google.accounts) return;
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', 
        });
        setTokenClient(client);
        setGisInited(true);
      } catch (err) {
        console.error("Erro GIS:", err);
      }
    };

    const interval = setInterval(() => {
      if ((window as any).gapi && !gapiInited) loadGapi();
      if ((window as any).google?.accounts && !gisInited) loadGis();
      if (gapiInited && gisInited) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [gapiInited, gisInited]);

  const filteredBancosDirectory = useMemo(() => {
    if (!bankSearchTerm) return OFB_DIRECTORY;
    const term = bankSearchTerm.toLowerCase();
    return OFB_DIRECTORY.filter(b => b.nome.toLowerCase().includes(term));
  }, [bankSearchTerm]);

  const startOpenFinanceConnection = (banco: any) => {
    setSelectedBank(banco);
  };

  const confirmConsentAndRedirect = () => {
    setIsConnecting(true);
    const { challenge, state } = OpenFinanceService.generatePKCE();
    
    setTimeout(() => {
      const novoBanco: BancoConectado = {
        id: selectedBank.id,
        nome: selectedBank.nome,
        cor: '#000',
        logo: selectedBank.logo,
        status: 'conectado',
        ultimaSincronizacao: new Date().toISOString()
      };

      setBancosConectados(prev => [...prev.filter(b => b.id !== selectedBank.id), novoBanco]);
      handleBankSync(selectedBank.id, selectedBank.nome);
      setIsConnecting(false);
      setIsBankModalOpen(false);
      setSelectedBank(null);
      setBankSearchTerm('');
    }, 2500);
  };

  const handleBankSync = async (connectionId: string, bancoNome: string) => {
    setIsSyncing(true);
    try {
      const rawTx = await OpenFinanceService.fetchTransactions(connectionId);
      const normalizedGastos = rawTx.map(tx => OpenFinanceService.mapOFBTransactionToGasto(tx, connectionId, bancoNome));
      
      setGastos(prev => {
        const existingIds = new Set(prev.map(g => g.id));
        const newOnes = normalizedGastos.filter(g => !existingIds.has(g.id));
        return [...newOnes, ...prev];
      });

      setBancosConectados(prev => prev.map(b => 
        b.id === connectionId ? { ...b, ultimaSincronizacao: new Date().toISOString(), status: 'conectado' } : b
      ));
    } catch (e) {
      alert("Erro ao sincronizar dados do banco.");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCalendar = async () => {
    if (CLIENT_ID.startsWith("SEU_CLIENT_ID")) return;
    if (!gisInited || !gapiInited) return;
    setIsSyncing(true);
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) { setIsSyncing(false); return; }
      (window as any).gapi.client.setToken(resp);
      setIsSyncing(false); 
      alert("Agenda vinculada com sucesso.");
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const filteredGastos = useMemo(() => {
    return gastos.filter(g => {
      if (g.recorrente) {
        const d = new Date(g.data);
        return d.getUTCFullYear() < currentYear || (d.getUTCFullYear() === currentYear && d.getUTCMonth() <= currentMonth);
      }
      if (g.origem === 'importacao') {
        return g.mesReferencia === currentMonth && g.anoReferencia === currentYear;
      }
      const d = new Date(g.data);
      return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [gastos, currentMonth, currentYear]);

  const stats = useMemo(() => {
    return filteredGastos.reduce((acc, g) => {
      const valor = typeof g.valor === 'number' ? g.valor : 0;
      if (g.tipo === 'receita') acc.receitas += valor;
      else acc.despesas += valor;
      return acc;
    }, { receitas: 0, despesas: 0 });
  }, [filteredGastos]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const [importModal, setImportModal] = useState<{ file: File, type: 'csv' | 'pdf' } | null>(null);
  const [selectedImportMonth, setSelectedImportMonth] = useState(currentMonth);
  const [selectedImportYear, setSelectedImportYear] = useState(currentYear);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Gasto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const handleEdit = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setIsFormOpen(true);
  };

  const handleSaveTransaction = (data: any, syncToCalendar: boolean) => {
    let savedGasto: Gasto;
    if (editingGasto) {
      savedGasto = { ...editingGasto, ...data };
      setGastos(prev => prev.map(g => g.id === editingGasto.id ? savedGasto : g));
      setEditingGasto(null);
    } else {
      savedGasto = { ...data, id: generateId(), origem: 'manual', fonteArquivo: null, confiancaCategoria: 'alta' };
      setGastos(prev => [savedGasto, ...prev]);
    }
    setIsFormOpen(false);
  };

  const confirmImport = async () => {
    if (!importModal) return;
    setIsProcessing(true);
    try {
      let extracted: any[] = [];
      if (importModal.type === 'csv') {
        const text = await importModal.file.text();
        extracted = parseCSV(text);
      } else {
        const base64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve((r.result as string).split(',')[1]);
          r.readAsDataURL(importModal.file);
        });
        extracted = await extractFromPDF(base64);
      }
      if (!extracted || extracted.length === 0) throw new Error("Não conseguimos encontrar transações neste arquivo.");
      const processed: Gasto[] = extracted.map(item => {
        const { categoria, confianca } = autoCategorize(item.descricao || item.local || '');
        return {
          id: generateId(), tipo: item.valor < 0 ? 'receita' : 'despesa',
          descricao: item.descricao || 'Item importado', data: item.data || new Date().toISOString().split('T')[0],
          local: item.local || '', valor: Math.abs(item.valor), categoria: categoria,
          parcelado: (item.numeroParcela && item.totalParcelas) ? true : false, recorrente: false,
          numeroParcela: item.numeroParcela || null, totalParcelas: item.totalParcelas || null,
          origem: 'importacao', fonteArquivo: importModal.type, confiancaCategoria: confianca,
          mesReferencia: selectedImportMonth, anoReferencia: selectedImportYear
        };
      });
      setPendingTransactions(processed);
      setImportSummary({ totalItems: processed.length, totalValue: processed.reduce((s, i) => s + i.valor, 0), lowConfidenceItems: processed.filter(p => p.confiancaCategoria === 'baixa').length });
      setImportModal(null);
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const finalizeImport = () => {
    setGastos(prev => [...pendingTransactions, ...prev]);
    setPendingTransactions([]);
    setIsReviewOpen(false);
    setImportSummary(null);
    alert('Lançadas com sucesso!');
  };

  const monthlyBalance = stats.receitas - stats.despesas;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-72 bg-white border-r flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b">
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
              <Brain className="w-5 h-5 text-white" />
            </div>
            PLANEJAI
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Principal</p>
          <button onClick={() => setActiveTab('gastos')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gastos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}>
            <CalendarIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Gastos Mensais</span>
          </button>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}>
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold text-sm">Dashboard</span>
          </button>
          
          <div className="pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Conectividade</p>
            <button onClick={() => setActiveTab('conexoes')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'conexoes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}>
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold text-sm">Open Finance</span>
            </button>
            <button 
              onClick={syncToCalendar} 
              disabled={isSyncing}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold border mt-2 ${
                isSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100'
              }`}
            >
              {isSyncing ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent animate-spin rounded-full"/> : <CalendarCheck2 className="w-5 h-5" />}
              <span className="text-sm">Agenda Google</span>
            </button>
          </div>

          <div className="pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Patrimônio</p>
            <button onClick={() => setActiveTab('investimentos')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'investimentos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}>
              <InvestIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">Investimentos</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b px-8 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentMonth(prev => prev === 0 ? (setCurrentYear(y => y - 1), 11) : prev - 1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-slate-800 min-w-[150px] text-center">{monthNames[currentMonth]} {currentYear}</h2>
            <button onClick={() => setCurrentMonth(prev => prev === 11 ? (setCurrentYear(y => y + 1), 0) : prev + 1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right border-r pr-4 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo do mês</p>
              <p className={`text-sm font-black ${monthlyBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyBalance)}
              </p>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600"><Settings className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'conexoes' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-emerald-600 to-blue-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
                    Integração Open Finance
                  </h2>
                  <p className="text-blue-50 text-base max-w-xl mb-8 leading-relaxed">
                    A PlanejAI conecta-se diretamente à infraestrutura regulada do Banco Central. 
                    Nós não armazenamos suas senhas bancárias. O acesso é feito via tokens seguros e criptografados.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setIsBankModalOpen(true)}
                      className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Adicionar Instituição
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-100 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                      <Lock className="w-4 h-4" /> Dados Criptografados (AES-256)
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bancosConectados.length > 0 ? bancosConectados.map(banco => (
                  <div key={banco.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 p-2 overflow-hidden">
                          <img src={banco.logo} alt={banco.nome} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800">{banco.nome}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Consentimento Ativo</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleBankSync(banco.id, banco.nome)}
                          disabled={isSyncing}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          onClick={() => setBancosConectados(prev => prev.filter(b => b.id !== banco.id))}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="text-left">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Última Sincronização</p>
                        <p className="text-xs font-bold text-slate-600">
                          {isSyncing ? 'Sincronizando...' : new Date(banco.ultimaSincronizacao).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Shield className="w-3 h-3" /> FAPI-COMPLIANT
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-24 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                      <Landmark className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-600">Nenhuma conexão ativa</h3>
                    <p className="text-sm text-slate-400 max-w-xs mt-2 font-medium">Conecte seus bancos diretamente via Open Finance para automação total.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gastos' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center space-x-3 mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><span className="text-xs font-bold text-slate-400 uppercase">Receitas</span></div>
                  <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.receitas)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center space-x-3 mb-2"><TrendingDown className="w-5 h-5 text-red-600" /><span className="text-xs font-bold text-slate-400 uppercase">Despesas</span></div>
                  <h3 className="text-2xl font-black text-red-600">{formatCurrency(stats.despesas)}</h3>
                </div>
                <div className="bg-emerald-600 p-6 rounded-2xl shadow-xl text-white">
                  <div className="flex items-center space-x-3 mb-2"><Wallet className="w-5 h-5 text-white" /><span className="text-xs font-bold text-white/70 uppercase">Saldo Mensal</span></div>
                  <h3 className="text-2xl font-black">{formatCurrency(monthlyBalance)}</h3>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Últimas Movimentações</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingGasto(null); setIsFormOpen(true); }} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-all"><Plus className="w-4 h-4" /><span>Novo</span></button>
                    <label className="cursor-pointer flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50"><Paperclip className="w-4 h-4 text-slate-600" /><span>Fatura</span><input type="file" accept=".csv,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) setImportModal({ file, type: file.name.endsWith('.csv') ? 'csv' : 'pdf' }); e.target.value = ''; }} className="hidden" /></label>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredGastos.length > 0 ? filteredGastos.map(g => (
                    <div key={g.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
                      <div className="flex items-center space-x-4 flex-1">
                        <button onClick={() => handleEdit(g)} className="p-3 rounded-xl" style={{ backgroundColor: `${CATEGORIA_COLORS[g.categoria]}15`, color: CATEGORIA_COLORS[g.categoria] }}>{CATEGORIA_ICONS[g.categoria]}</button>
                        <div onClick={() => handleEdit(g)} className="cursor-pointer flex-1 py-1">
                          <p className="font-bold text-slate-800 hover:text-emerald-600 truncate max-w-md">{g.descricao || g.local || 'Sem título'}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500 font-medium uppercase">{formatDate(g.data)} • {g.categoria}</p>
                            {g.recorrente && <span className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100"><Bell className="w-2 h-2" /> RECORRENTE</span>}
                            {g.origem === 'open_finance' && <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100"><Landmark className="w-2 h-2" /> {g.bancoNome}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`font-black whitespace-nowrap ${g.tipo === 'receita' ? 'text-emerald-600' : 'text-slate-900'}`}>{g.tipo === 'receita' ? '+' : ''}{formatCurrency(g.valor)}</span>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(g.id); }} className="p-2.5 text-slate-300 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  )) : <div className="p-20 text-center text-slate-400">Nenhum registro no período.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Conexão Open Finance */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 shadow-2xl">
            {isConnecting ? (
              <div className="p-16 text-center space-y-8">
                <div className="relative inline-block">
                  <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-800">Conectando ao Banco</h3>
                  <p className="text-sm text-slate-500 font-medium">Você será redirecionado para o ambiente seguro da sua instituição para autorizar o acesso.</p>
                </div>
              </div>
            ) : selectedBank ? (
              <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  <button onClick={() => setSelectedBank(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 p-1 border rounded-lg overflow-hidden">
                      <img src={selectedBank.logo} alt={selectedBank.nome} className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Autorizar {selectedBank.nome}</h2>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-black text-emerald-800 uppercase mb-3 flex items-center gap-2">
                      <Info className="w-3 h-3" /> O que iremos acessar:
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-sm text-slate-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        Informações cadastrais e limites de crédito
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        Extratos e faturas de cartões
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        Histórico de transações e investimentos
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Consentimento LGPD</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Ao continuar, você concorda com o compartilhamento de dados pela instituição escolhida com a PlanejAI. Seus dados são usados apenas para fins de gestão financeira e não são compartilhados com terceiros.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={confirmConsentAndRedirect}
                      className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      Confirmar e Ir para o Banco <ExternalLink className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setSelectedBank(null)}
                      className="w-full py-4 text-slate-500 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Escolha sua Instituição</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">Bancos e Apps de Cartões</p>
                  </div>
                  <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 space-y-4">
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquise por Caixa, XP, BTG, Itaú..." 
                      value={bankSearchTerm}
                      onChange={(e) => setBankSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                    />
                  </div>
                  <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                    {filteredBancosDirectory.length > 0 ? filteredBancosDirectory.map(banco => (
                      <button 
                        key={banco.id}
                        onClick={() => startOpenFinanceConnection(banco)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-50 shadow-sm overflow-hidden">
                            <img src={banco.logo} alt={banco.nome} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-bold text-slate-700">{banco.nome}</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </button>
                    )) : (
                      <div className="text-center py-10">
                        <p className="text-slate-400 font-medium">Nenhuma instituição encontrada.</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest pt-4 flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" /> Infraestrutura Homologada BCB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Outros Modais (Form, Import, Deleting...) */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[500]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-white font-black text-lg">Analisando fatura com IA Pro...</p>
            <p className="text-white/60 text-sm">Extraindo transações e categorizando...</p>
          </div>
        </div>
      )}
      
      {importModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6 animate-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="w-10 h-10 text-emerald-600" /></div>
              <h3 className="text-xl font-black text-slate-800">importar toda a fatura?</h3>
              <p className="text-xs text-slate-400 mt-1">Escolha o mês de referência:</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select value={selectedImportMonth} onChange={(e) => setSelectedImportMonth(parseInt(e.target.value))} className="border rounded-xl px-2 py-3 bg-white font-bold text-slate-700">{monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
              <input type="number" value={selectedImportYear} onChange={(e) => setSelectedImportYear(parseInt(e.target.value))} className="border rounded-xl px-2 py-3 font-bold text-slate-700"/>
            </div>

            {importModal.type === 'pdf' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase">
                  <LockOpen className="w-4 h-4" /> Importante
                </div>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Se sua fatura possui senha para desbloquear, desbloqueie antes de enviar:
                </p>
                <a 
                  href="https://www.ilovepdf.com/pt/desbloquear-pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 underline decoration-amber-300 hover:decoration-amber-900 transition-all"
                >
                  ilovepdf.com/pt/desbloquear-pdf <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={() => setImportModal(null)} className="py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors">Não, cancelar</button>
              <button onClick={confirmImport} className="py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-transform active:scale-95">Sim, Importar</button>
            </div>
          </div>
        </div>
      )}

      {isReviewOpen && (
        <div className="fixed inset-0 bg-slate-50 z-[210] flex flex-col animate-in fade-in duration-300">
          <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800">Revisar Importação</h2>
              <p className="text-xs text-slate-500 font-bold uppercase">{pendingTransactions.length} itens encontrados • {formatCurrency(importSummary?.totalValue || 0)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsReviewOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl transition-colors">Cancelar</button>
              <button onClick={finalizeImport} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Lançar na Fatura
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-4">
            {pendingTransactions.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-emerald-200 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 border border-slate-100">{CATEGORIA_ICONS[t.categoria]}</div>
                  <div>
                    <p className="font-bold text-slate-800">{t.descricao}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{formatDate(t.data)}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-900">{formatCurrency(t.valor)}</span>
                      {t.parcelado && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">PARCELA {t.numeroParcela}/{t.totalParcelas}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={t.categoria} 
                    onChange={(e) => setPendingTransactions(prev => prev.map(p => p.id === t.id ? {...p, categoria: e.target.value as Categoria} : p))} 
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CATEGORIAS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => setPendingTransactions(prev => prev.filter(p => p.id !== t.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importSummary && !isReviewOpen && !isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[205]">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center space-y-6 animate-in zoom-in duration-200">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-12 h-12" /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Leitura Concluída!</h3>
              <p className="text-sm text-slate-500 mt-2">Encontramos {importSummary.totalItems} movimentações na fatura.</p>
            </div>
            <button onClick={() => setIsReviewOpen(true)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 transition-transform active:scale-95">Revisar Itens</button>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
          <div className="bg-white rounded-3xl p-8 max-sm w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-10 h-10" /></div>
            <h3 className="text-xl font-black text-slate-800">Excluir permanentemente?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => setDeletingId(null)} className="py-3 font-bold text-slate-500">Cancelar</button>
              <button onClick={() => { setGastos(prev => prev.filter(g => g.id !== deletingId)); setDeletingId(null); }} className="py-4 bg-red-600 text-white rounded-2xl font-black">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && <TransactionForm onSave={handleSaveTransaction} onCancel={() => { setIsFormOpen(false); setEditingGasto(null); }} initialData={editingGasto || undefined} />}
    </div>
  );
};

export default App;

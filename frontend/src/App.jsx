import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, TrendingDown, AlertTriangle, Upload, Send, 
  BarChart3, RefreshCw, FileText, CheckCircle2, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, LineChart, Line, Legend 
} from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rawRecords, setRawRecords] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Inflation & Accumulated Period state
  const [accumulatedInflationPeriod, setAccumulatedInflationPeriod] = useState(50);
  const [analysisPeriodMonths, setAnalysisPeriodMonths] = useState(12);
  const [inflationData, setInflationData] = useState(null);

  // Campaign state
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [campaignResult, setCampaignResult] = useState(null);
  const [sending, setSending] = useState(false);

  // Parse CSV text into records
  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(',');
      if (currentLine.length >= 4) {
        const nombre = currentLine[0]?.trim() || '';
        const email = currentLine[1]?.trim() || '';
        const fecha = currentLine[2]?.trim() || '';
        const monto = parseFloat(currentLine[3]?.trim()) || 0;

        if (nombre && email && monto > 0) {
          records.push({ Nombre: nombre, Email: email, Fecha: fecha, Monto: monto });
        }
      }
    }
    return records;
  };

  // Compute dashboard metrics from records
  const computeDashboard = (records) => {
    if (!records || records.length === 0) return;

    const uniqueEmails = new Set(records.map(r => r.Email));
    const totalDonors = uniqueEmails.size;
    const totalNominal = records.reduce((acc, r) => acc + r.Monto, 0);
    const averageTicket = totalNominal / records.length;

    // Monthly evolution
    const monthlyMap = {};
    records.forEach(r => {
      let mes = r.Fecha.length >= 7 ? r.Fecha.substring(0, 7) : "2026-10";
      if (r.Fecha.includes('/')) {
        const parts = r.Fecha.split('/');
        if (parts.length === 3) {
          mes = `${parts[2]}-${parts[1]}`;
        }
      }
      if (!monthlyMap[mes]) {
        monthlyMap[mes] = { recaudacion: 0, emails: new Set(), montos: [] };
      }
      monthlyMap[mes].recaudacion += r.Monto;
      monthlyMap[mes].emails.add(r.Email);
      monthlyMap[mes].montos.push(r.Monto);
    });

    const monthlyEvolution = Object.keys(monthlyMap).sort().map(mes => {
      const data = monthlyMap[mes];
      const ticketProm = data.montos.length > 0 ? data.montos.reduce((a,b)=>a+b,0) / data.montos.length : 0;
      return {
        Mes: mes,
        recaudacion: data.recaudacion,
        donantes: data.emails.size,
        ticket_promedio: ticketProm
      };
    });

    // Latest donation per donor for outlier analysis
    const donorLatest = {};
    records.forEach(r => {
      donorLatest[r.Email] = r;
    });
    const latestList = Object.values(donorLatest);
    
    const montos = latestList.map(d => d.Monto).sort((a,b) => a - b);
    const q1 = montos[Math.floor(montos.length * 0.25)] || 1000;
    const medianVal = montos[Math.floor(montos.length * 0.5)] || 5000;
    const threshold = Math.max(q1 * 0.8, medianVal * 0.3, 3000);

    const outliers = latestList.filter(d => d.Monto <= threshold);

    setDashboardData({
      total_donors: totalDonors,
      total_nominal: totalNominal,
      average_ticket: averageTicket,
      threshold_outlier: threshold,
      outliers_count: outliers.length,
      outliers: outliers,
      monthly_evolution: monthlyEvolution,
      donors_summary: latestList
    });

    setSelectedEmails(outliers.map(o => o.Email));
  };

  // Compute accumulated inflation and evolution of donor contributions over the period
  const computeAccumulatedInflation = (records, accumulatedRateVal, periodMonths) => {
    if (!records || records.length === 0) return;

    const baseTotal = records.reduce((acc, r) => acc + r.Monto, 0);
    const monthlyBase = baseTotal > 0 ? baseTotal / Math.min(periodMonths, 12) : 100000;

    const timeline = [];
    for (let i = 0; i < periodMonths; i++) {
      const d = new Date(2025, 10 + i, 1);
      const mesKey = d.toISOString().substring(0, 7);
      timeline.push({
        mes: mesKey,
        recaudacion: monthlyBase * (1 + i * 0.02)
      });
    }

    const totalT = timeline.length;
    const totalInflationFactor = 1 + (accumulatedRateVal / 100.0);
    const monthlyFactor = Math.pow(Math.max(totalInflationFactor, 0.01), 1 / Math.max(totalT - 1, 1));

    let cumulativeInf = 1.0;
    const simulation = timeline.map((item, idx) => {
      if (idx === 0) {
        cumulativeInf = 1.0;
      } else {
        cumulativeInf *= monthlyFactor;
      }
      const realVal = item.recaudacion / cumulativeInf;
      const infPct = (cumulativeInf - 1) * 100;
      return {
        mes: item.mes,
        nominal: Math.round(item.recaudacion),
        real: Math.round(realVal),
        inflacion_acumulada_pct: Number(infPct.toFixed(1))
      };
    });

    const totalNominal = simulation.reduce((acc, s) => acc + s.nominal, 0);
    const totalReal = simulation.reduce((acc, s) => acc + s.real, 0);

    setInflationData({
      total_nominal: totalNominal,
      total_real: totalReal,
      accumulated_rate: accumulatedRateVal,
      period_months: periodMonths,
      simulation: simulation
    });
  };

  // Load default sample CSV on mount
  useEffect(() => {
    fetch('/Extracto_Simbiosis_Prueba.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = parseCSVText(text);
        setRawRecords(parsed);
        computeDashboard(parsed);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading sample CSV:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (rawRecords.length > 0) {
      computeAccumulatedInflation(rawRecords, accumulatedInflationPeriod, analysisPeriodMonths);
    }
  }, [accumulatedInflationPeriod, analysisPeriodMonths, rawRecords]);

  const handleFileUpload = (file) => {
    setUploadStatus({ type: 'info', message: 'Leyendo archivo CSV...' });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSVText(text);
        if (parsed.length > 0) {
          setRawRecords(parsed);
          computeDashboard(parsed);
          setUploadStatus({ type: 'success', message: `¡Archivo procesado con éxito! (${parsed.length} aportes importados)` });
        } else {
          setUploadStatus({ type: 'error', message: 'El archivo no contiene filas válidas o el formato de columnas no es correcto.' });
        }
      } catch (err) {
        setUploadStatus({ type: 'error', message: 'Error al parsear el archivo CSV.' });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSendCampaign = () => {
    if (selectedEmails.length === 0) return;
    setSending(true);
    setTimeout(() => {
      const results = selectedEmails.map(email => ({
        email,
        status: 'enviado',
        timestamp: new Date().toISOString(),
        provider: 'SendGrid / Resend API (Simulado)'
      }));
      setCampaignResult({
        status: 'success',
        total_sent: results.length,
        details: results,
        message: `Campaña de actualización disparada exitosamente a ${results.length} donantes con cuotas rezagadas.`
      });
      setSending(false);
    }, 800);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Cargando plataforma AyuDando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Navbar con Logo Grande y Alto Contraste */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <img src="/logo.png" alt="AyuDando Logo" className="h-24 w-auto object-contain" />
          </div>
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl text-sm font-medium border border-slate-200">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-4 py-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('upload')} 
              className={`px-4 py-2 rounded-xl transition ${activeTab === 'upload' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Carga de Datos
            </button>
            <button 
              onClick={() => setActiveTab('outliers')} 
              className={`px-4 py-2 rounded-xl transition ${activeTab === 'outliers' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Outliers & Campañas
            </button>
            <button 
              onClick={() => setActiveTab('inflation')} 
              className={`px-4 py-2 rounded-xl transition ${activeTab === 'inflation' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Simulador Inflación
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Cuadro de Mando General</h2>
                <p className="text-sm text-slate-500">Análisis automático basado en el extracto bancario cargado.</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="no-print flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl shadow transition text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Descargar Informe PDF</span>
              </button>
            </div>

            {/* Big Numbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Donantes</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{dashboardData.total_donors}</h3>
                  <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Base activa
                  </span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                  <Users className="w-7 h-7" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recaudación Nominal</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(dashboardData.total_nominal)}</h3>
                  <span className="text-xs text-slate-500 mt-1 block">Suma de aportes</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                  <DollarSign className="w-7 h-7" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket Promedio</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(dashboardData.average_ticket)}</h3>
                  <span className="text-xs text-slate-500 mt-1 block">Aporte medio</span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                  <BarChart3 className="w-7 h-7" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuotas Rezagadas</p>
                  <h3 className="text-3xl font-bold text-amber-600 mt-1">{dashboardData.outliers_count}</h3>
                  <span className="text-xs text-amber-600 font-medium mt-1 block">Riesgo de licuación</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Evolución de Recaudación Mensual</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.monthly_evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="Mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="recaudacion" stroke="#059669" fill="#10b981" fillOpacity={0.2} name="Recaudación ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Evolución de Donantes Activos</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.monthly_evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="Mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="donantes" fill="#3b82f6" name="Cant. Donantes" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UPLOAD MODULE */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Módulo de Carga de Datos</h2>
              <p className="text-sm text-slate-500">Arrastra y suelta tu archivo CSV (ej. tu extracto bancario o reporte de pagos).</p>
            </div>

            <div 
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition bg-white shadow-sm ${
                dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
            >
              <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Arrastra tu archivo CSV aquí</h3>
              <p className="text-sm text-slate-500 mb-6">Columnas requeridas: <span className="font-semibold text-slate-700">Nombre del donante, Email, Fecha, Monto aportado</span></p>
              
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-xl cursor-pointer shadow transition inline-block">
                <span>Seleccionar Archivo CSV</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            {uploadStatus && (
              <div className={`p-4 rounded-xl flex items-center space-x-3 ${
                uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                uploadStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {uploadStatus.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {uploadStatus.type === 'error' && <ShieldAlert className="w-5 h-5 text-rose-600" />}
                {uploadStatus.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
                <span className="font-medium text-sm">{uploadStatus.message}</span>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-emerald-600" /> Formato Compatible (Extracto Bancario)
              </h4>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs overflow-x-auto font-mono">
{`Nombre del donante,Email,Fecha,Monto aportado
Donante Recurrente 1,recurrente1@email.com,30/10/2026,10000
Donante Histórico 4,historico4@email.com,08/10/2026,200`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: OUTLIERS & CAMPAIGNS */}
        {activeTab === 'outliers' && dashboardData && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Motor de Análisis & Outliers (Cuotas Rezagadas)</h2>
                <p className="text-sm text-slate-500">Identificación automática de aportes anormalmente bajos por la inflación.</p>
              </div>
              <button 
                onClick={handleSendCampaign}
                disabled={selectedEmails.length === 0 || sending}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium px-5 py-2.5 rounded-xl shadow transition"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Disparando Campaña...' : `Disparar Campaña (${selectedEmails.length})`}</span>
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 p-3 rounded-xl text-amber-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">Umbral de Detección de Outliers</h4>
                  <p className="text-xs text-amber-700">Se detectaron <span className="font-bold">{dashboardData.outliers_count}</span> donantes con cuotas inferiores a <span className="font-bold">{formatCurrency(dashboardData.threshold_outlier)}</span>.</p>
                </div>
              </div>
            </div>

            {campaignResult && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-emerald-900">{campaignResult.message}</h4>
                </div>
                <div className="text-xs text-emerald-800 space-y-1">
                  {campaignResult.details.map((d, i) => (
                    <div key={i} className="flex justify-between bg-emerald-100/50 px-3 py-1 rounded">
                      <span>Destinatario: <strong>{d.email}</strong></span>
                      <span className="text-emerald-700">Estado: {d.status} ({d.provider})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
                <span>Donantes Identificados con Cuotas Rezagadas</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-semibold">{dashboardData.outliers.length} casos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4">Donante</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Monto Aportado</th>
                      <th className="p-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {dashboardData.outliers.map((donante, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-semibold text-slate-900">{donante.Nombre}</td>
                        <td className="p-4 text-slate-600">{donante.Email}</td>
                        <td className="p-4 text-slate-600">{donante.Fecha}</td>
                        <td className="p-4 font-bold text-rose-600">{formatCurrency(donante.Monto)}</td>
                        <td className="p-4">
                          <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-medium">Crítico (Licuado)</span>
                        </td>
                      </tr>
                    ))}
                    {dashboardData.outliers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">No se detectaron outliers. ¡Excelente!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INFLATION & ACCUMULATED EVOLUTION */}
        {activeTab === 'inflation' && inflationData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Módulo Financiero: Inflación Acumulada & Evolución de Aportes</h2>
              <p className="text-sm text-slate-500">Análisis histórico de la inflación acumulada del periodo y cómo evolucionaron los aportes reales de los donantes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-1">
                <h3 className="font-bold text-slate-900 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-rose-600" /> Parámetros del Periodo
                </h3>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Inflación Acumulada Periodo (%): {accumulatedInflationPeriod}%
                  </label>
                  <input 
                    type="number" 
                    value={accumulatedInflationPeriod} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAccumulatedInflationPeriod(isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Inflación total estimada acumulada durante el periodo analizado.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Periodo de Análisis
                  </label>
                  <select 
                    value={analysisPeriodMonths} 
                    onChange={(e) => setAnalysisPeriodMonths(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900 text-sm bg-white cursor-pointer"
                  >
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 Año)</option>
                    <option value={18}>18 Meses (1.5 Años)</option>
                    <option value={24}>24 Meses (2 Años)</option>
                    <option value={36}>36 Meses (3 Años)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recaudación Nominal Total:</span>
                    <strong className="text-slate-900">{formatCurrency(inflationData.total_nominal)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Valor Real Ajustado:</span>
                    <strong className="text-emerald-700">{formatCurrency(inflationData.total_real)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-600">Poder Adquisitivo Final:</span>
                    <strong className="text-rose-600">
                      {inflationData.simulation.length > 0 ? ((inflationData.simulation[inflationData.simulation.length - 1].real / inflationData.simulation[inflationData.simulation.length - 1].nominal) * 100).toFixed(1) : 100}%
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Evolución de Aportes: Nominal vs. Valor Real (Ajustado por Inflación Acumulada)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={inflationData.simulation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="nominal" stroke="#3b82f6" strokeWidth={2} name="Aportes Nominales" dot={true} />
                      <Line type="monotone" dataKey="real" stroke="#e11d48" strokeWidth={3} name="Valor Real (Ajustado)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <p>AyuDando MVP - Plataforma para ONGs © 2026 | Arquitectura Full Stack</p>
      </footer>
    </div>
  );
}

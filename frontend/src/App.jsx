import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, TrendingDown, AlertTriangle, Upload, Send, 
  BarChart3, RefreshCw, FileText, CheckCircle2, ShieldAlert, ArrowUpRight, HeartHandshake, Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, LineChart, Line, Legend 
} from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Inflation state
  const [monthlyInflation, setMonthlyInflation] = useState(4.5);
  const [inflationMonths, setInflationMonths] = useState(12);
  const [inflationData, setInflationData] = useState(null);

  // Campaign state
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [campaignResult, setCampaignResult] = useState(null);
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
      if (data.outliers) {
        setSelectedEmails(data.outliers.map(o => o.Email));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor backend (FastAPI). Asegúrate de que esté corriendo en el puerto 8000.');
      setLoading(false);
    }
  };

  const fetchInflation = async () => {
    try {
      const res = await fetch('/api/inflation-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_inflation_rate: monthlyInflation, months: inflationMonths })
      });
      const data = await res.json();
      setInflationData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchInflation();
  }, [monthlyInflation, inflationMonths, dashboardData]);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploadStatus({ type: 'info', message: 'Subiendo y procesando archivo...' });
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: 'success', message: `${data.message} (${data.rows_imported} filas)` });
        fetchData();
      } else {
        setUploadStatus({ type: 'error', message: data.detail || 'Error al procesar el archivo' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Error de red al subir el archivo.' });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSendCampaign = async () => {
    if (selectedEmails.length === 0) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedEmails)
      });
      const data = await res.json();
      setCampaignResult(data);
      setSending(false);
    } catch (err) {
      console.error(err);
      setSending(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Cargando plataforma de donaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Navbar */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-amber-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>{error}</span>
            </div>
            <button onClick={fetchData} className="text-xs bg-amber-200 px-3 py-1 rounded font-bold hover:bg-amber-300">Reintentar</button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Cuadro de Mando General</h2>
                <p className="text-sm text-slate-500">Métricas clave actualizadas en tiempo real desde el extracto bancario.</p>
              </div>
              <button 
                onClick={fetchData} 
                className="flex items-center space-x-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar Datos</span>
              </button>
            </div>

            {/* Big Numbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Donantes</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{dashboardData.total_donors}</h3>
                  <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Base activa mensual
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
                  <span className="text-xs text-slate-500 mt-1 block">Suma histórica de aportes</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                  <DollarSign className="w-7 h-7" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket Promedio</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(dashboardData.average_ticket)}</h3>
                  <span className="text-xs text-slate-500 mt-1 block">Aporte medio por donación</span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                  <BarChart3 className="w-7 h-7" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuotas Rezagadas</p>
                  <h3 className="text-3xl font-bold text-amber-600 mt-1">{dashboardData.outliers_count}</h3>
                  <span className="text-xs text-amber-600 font-medium mt-1 block">Requieren actualización</span>
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
              <p className="text-sm text-slate-500">Arrastra y suelta tu archivo CSV o Excel del extracto bancario o pasarela de pagos.</p>
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
              <h3 className="text-lg font-bold text-slate-900 mb-1">Arrastra tu archivo CSV o Excel aquí</h3>
              <p className="text-sm text-slate-500 mb-6">Columnas requeridas: <span className="font-semibold text-slate-700">Nombre, Email, Fecha, Monto</span></p>
              
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-xl cursor-pointer shadow transition inline-block">
                <span>Seleccionar Archivo</span>
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
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
                <FileText className="w-5 h-5 mr-2 text-emerald-600" /> Formato de Ejemplo Recomendado (CSV)
              </h4>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs overflow-x-auto font-mono">
{`Nombre,Email,Fecha,Monto
Juan Pérez,juan.perez@example.com,2026-03-01,5000
María Gómez,maria.gomez@example.com,2026-03-02,50000
Roberto Sánchez,roberto.sanchez@example.com,2026-03-03,500`}
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
                <p className="text-sm text-slate-500">Identificación automática de donantes con aportes anormalmente bajos debido a la inflación.</p>
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
                  <p className="text-xs text-amber-700">Se detectaron <span className="font-bold">{dashboardData.outliers_count}</span> donantes con cuotas inferiores a <span className="font-bold">{formatCurrency(dashboardData.threshold_outlier)}</span> (riesgo crítico de licuación).</p>
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
                      <th className="p-4">Última Fecha</th>
                      <th className="p-4">Monto Actual</th>
                      <th className="p-4">Estado de Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {dashboardData.outliers.map((donante, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-semibold text-slate-900">{donante.Nombre}</td>
                        <td className="p-4 text-slate-600">{donante.Email}</td>
                        <td className="p-4 text-slate-600">{donante.Fecha ? donante.Fecha.substring(0, 10) : 'N/A'}</td>
                        <td className="p-4 font-bold text-rose-600">{formatCurrency(donante.Monto)}</td>
                        <td className="p-4">
                          <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-medium">Crítico (Licuado)</span>
                        </td>
                      </tr>
                    ))}
                    {dashboardData.outliers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">No se detectaron outliers o cuotas anormalmente bajas. ¡Excelente!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INFLATION SIMULATOR */}
        {activeTab === 'inflation' && inflationData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Módulo Financiero: Ajuste por Inflación</h2>
              <p className="text-sm text-slate-500">Simulador de pérdida de valor de las cuotas fijas de los donantes frente a distintos escenarios inflacionarios.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-1">
                <h3 className="font-bold text-slate-900 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-rose-600" /> Parámetros de Inflación
                </h3>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Inflación Mensual Est. (%): {monthlyInflation}%
                  </label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="15" 
                    step="0.5" 
                    value={monthlyInflation} 
                    onChange={(e) => setMonthlyInflation(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Proyección (Meses): {inflationMonths}
                  </label>
                  <input 
                    type="range" 
                    min="3" 
                    max="36" 
                    step="1" 
                    value={inflationMonths} 
                    onChange={(e) => setInflationMonths(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Recaudación:</span>
                    <strong className="text-slate-900">{formatCurrency(inflationData.base_amount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Poder Adquisitivo Final:</span>
                    <strong className="text-rose-600">
                      {inflationData.simulation[inflationData.simulation.length - 1]?.poder_adquisitivo_pct}%
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Pérdida de Valor Real vs. Monto Nominal</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={inflationData.simulation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="nominal" stroke="#3b82f6" strokeWidth={2} name="Monto Nominal (Sin Ajuste)" dot={false} />
                      <Line type="monotone" dataKey="real" stroke="#e11d48" strokeWidth={3} name="Valor Real (Ajustado por Inflación)" />
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

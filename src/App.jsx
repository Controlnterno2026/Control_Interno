import React, { useState, useEffect, useMemo } from 'react';
import Page1Operaciones from './components/Page1Operaciones';
import Page2TrazabilidadVS from './components/Page2TrazabilidadVS';
import Page3Ranking from './components/Page3Ranking';
import FileUploadModal from './components/FileUploadModal';
import { calculateAvailableDates, countRecordsInDateRange, filterDataset, purgeDatesFromDataset } from './utils/dataProcessor';
import { 
  BarChart3, 
  GitCompare, 
  Trophy, 
  UploadCloud
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('operaciones');
  const [rawDataset, setRawDataset] = useState({ mercado: [], bodega_camiones: [], bodega_observaciones: [], bodega_faltantes_sobrantes: [], loaded_files: [], available_dates: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Global Filter State
  const [filters, setFilters] = useState({
    mercadoDateStart: '',
    mercadoDateEnd: '',
    bodegaDateStart: '',
    bodegaDateEnd: '',
    errorType: 'TODOS',
    advisor: 'TODOS',
    searchQuery: ''
  });

  // Fetch initial data from public/data.json
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const response = await fetch('/data.json');
        if (!response.ok) {
          throw new Error(`Status HTTP: ${response.status}`);
        }
        const data = await response.json();
        setRawDataset({
          ...data,
          available_dates: calculateAvailableDates(data)
        });
      } catch (err) {
        console.error("Error loading data.json:", err);
        setLoadError("No se pudo cargar el archivo data.json inicial.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const filteredData = useMemo(() => {
    return filterDataset(rawDataset, filters);
  }, [rawDataset, filters]);

  const allAdvisorNames = useMemo(() => {
    const set = new Set();
    (rawDataset.mercado || []).forEach(m => {
      if (m.distribuidor) set.add(m.distribuidor);
      if (m.asesor) set.add(m.asesor);
    });
    (rawDataset.bodega_camiones || []).forEach(b => { 
      if (b.usuario_bodega) set.add(b.usuario_bodega);
      if (b.usuario_control) set.add(b.usuario_control);
      if (b.usuario_despacho) set.add(b.usuario_despacho);
    });
    return Array.from(set).filter(n => n && n !== 'Sin Usuario' && n !== 'Sin Nombre').sort();
  }, [rawDataset]);

  const handleDataUploaded = (newParsedData) => {
    setRawDataset(prev => {
      const mercadoAdded = newParsedData.mercado || [];
      const camionesAdded = newParsedData.bodega_camiones || [];
      const observacionesAdded = newParsedData.bodega_observaciones || [];
      const faltantesAdded = newParsedData.bodega_faltantes_sobrantes || [];
      const recordsCount = mercadoAdded.length + camionesAdded.length + observacionesAdded.length + faltantesAdded.length;
      const uploadedDates = [
        ...mercadoAdded,
        ...camionesAdded,
        ...observacionesAdded,
        ...faltantesAdded
      ].map(item => item.fecha).filter(Boolean).sort();

      const nextDataset = {
        mercado: [...mercadoAdded, ...(prev.mercado || [])],
        bodega_camiones: [...camionesAdded, ...(prev.bodega_camiones || [])],
        bodega_observaciones: [...observacionesAdded, ...(prev.bodega_observaciones || [])],
        bodega_faltantes_sobrantes: [...faltantesAdded, ...(prev.bodega_faltantes_sobrantes || [])],
        loaded_files: [
        {
          fileName: newParsedData.fileName || 'Archivo Subido',
          fileType: mercadoAdded.length > 0 ? 'Mercado' : 'Bodega Informe',
          recordsCount,
          startDate: uploadedDates[0] || 'Nuevo',
          endDate: uploadedDates[uploadedDates.length - 1] || 'Nuevo'
        },
        ...(prev.loaded_files || [])
        ]
      };

      return {
        ...nextDataset,
        available_dates: calculateAvailableDates(nextDataset)
      };
    });
  };

  const handleDatesDeleted = (startDate, endDate) => {
    const finalEndDate = endDate || startDate;
    const summary = countRecordsInDateRange(rawDataset, startDate, finalEndDate);
    if (summary.total > 0) {
      setRawDataset(prev => purgeDatesFromDataset(prev, startDate, finalEndDate));
    }
    return summary;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="logo-badge">CC</div>
          <div>
            <div className="brand-title">Control Interno Coca-Cola</div>
            <div className="brand-subtitle">Operaciones, Reclamos & Trazabilidad</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'operaciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('operaciones')}
          >
            <BarChart3 size={18} />
            Pag 1: Operaciones Internas
          </button>

          <button
            className={`tab-btn ${activeTab === 'vs_trazabilidad' ? 'active' : ''}`}
            onClick={() => setActiveTab('vs_trazabilidad')}
          >
            <GitCompare size={18} />
            Pag 2: Control Bodega VS Mercado
          </button>

          <button
            className={`tab-btn ${activeTab === 'ranking' ? 'active' : ''}`}
            onClick={() => setActiveTab('ranking')}
          >
            <Trophy size={18} />
            Pag 3: Ranking & Tendencias
          </button>
        </nav>

        {/* File Upload Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <UploadCloud size={18} />
            Subir Archivos & Fechas
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1.5rem 2rem', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #E61D2B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff' }}>Cargando datos operacionales Coca-Cola...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Consolidando Mercado y Bodega por mes y fecha</p>
          </div>
        )}

        {loadError && !isLoading && (
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#FCA5A5', marginBottom: '1.5rem' }}>
            {loadError}
          </div>
        )}

        {!isLoading && (
          <>
            {activeTab === 'operaciones' && (
              <Page1Operaciones
                filteredData={filteredData}
                filters={filters}
                setFilters={setFilters}
                allAdvisors={allAdvisorNames}
              />
            )}

            {activeTab === 'vs_trazabilidad' && (
              <Page2TrazabilidadVS
                filteredData={filteredData}
              />
            )}

            {activeTab === 'ranking' && (
              <Page3Ranking
                filteredData={filteredData}
              />
            )}
          </>
        )}
      </main>

      <footer style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-light)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', background: 'rgba(11, 14, 20, 0.95)' }}>
        Dashboard de Control Interno y Auditoría de Operaciones Diarias | Coca-Cola Bolivia © {new Date().getFullYear()}
      </footer>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataUploaded={handleDataUploaded}
        onDatesDeleted={handleDatesDeleted}
        loadedFiles={rawDataset.loaded_files}
        availableDates={rawDataset.available_dates}
      />

    </div>
  );
}

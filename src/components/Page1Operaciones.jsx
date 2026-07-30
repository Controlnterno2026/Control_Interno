import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import { getPage1CombinationChartData, getPage1Metrics } from '../utils/dataProcessor';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Package, 
  TrendingUp, 
  FileSpreadsheet,
  Layers,
  Calendar,
  Percent
} from 'lucide-react';

export default function Page1Operaciones({ filteredData, filters, setFilters, allAdvisors }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes } = filteredData;

  // Chart data: Columns = Total Cargas, Line = Cargas Observadas
  const chartData = getPage1CombinationChartData(bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes, mercado);

  // Metrics with Cantidad & Porcentaje
  const metrics = getPage1Metrics(mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes);

  const chartOptions = {
    chart: {
      type: 'line',
      height: 380,
      toolbar: { show: true, tools: { download: true, selection: false, zoom: true } },
      background: 'transparent'
    },
    theme: { mode: 'dark' },
    stroke: {
      width: [0, 4],
      curve: 'smooth'
    },
    plotOptions: {
      bar: {
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    colors: ['#0F4C81', '#E61D2B'], // Blue column for Total Cargas, Red line for Cargas Observadas
    fill: {
      opacity: [0.75, 1],
      gradient: {
        inverseColors: false,
        shade: 'dark',
        type: "vertical",
        opacityFrom: 0.75,
        opacityTo: 0.45
      }
    },
    labels: chartData.categories,
    markers: {
      size: [0, 5],
      colors: ['#0F4C81', '#FF5252'],
      strokeWidth: 2
    },
    xaxis: {
      type: 'category',
      labels: {
        style: { colors: '#94A3B8', fontSize: '11px', fontFamily: 'Inter' },
        rotate: -45
      }
    },
    yaxis: [
      {
        title: {
          text: 'Cantidad de Cargas (Barras)',
          style: { color: '#60A5FA', fontWeight: 600, fontFamily: 'Outfit' }
        },
        labels: { style: { colors: '#60A5FA' } }
      },
      {
        opposite: true,
        title: {
          text: 'Cargas Observadas (Línea)',
          style: { color: '#E61D2B', fontWeight: 600, fontFamily: 'Outfit' }
        },
        labels: { style: { colors: '#E61D2B' } }
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark',
      y: {
        formatter: (val) => `${val || 0} cargas`
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#F1F5F9' }
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.08)'
    }
  };

  const chartSeries = [
    {
      name: 'Cantidad de Cargas (Barras)',
      type: 'column',
      data: chartData.cargasTotalesSeries
    },
    {
      name: 'Cargas Observadas (Línea)',
      type: 'line',
      data: chartData.cargasObservadasSeries
    }
  ];

  // Pagination for table
  const totalRecords = mercado.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = mercado.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderTypeBadge = (tipo) => {
    const t = (tipo || '').toUpperCase();
    if (t.includes('SOBRANTE')) return <span className="badge badge-sobrante">Sobrante</span>;
    if (t.includes('CRUCE')) return <span className="badge badge-cruce">Cruce</span>;
    if (t.includes('VAC')) return <span className="badge badge-vacia">Vacía</span>;
    return <span className="badge badge-faltante">Faltante</span>;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            Operaciones Internas: Cargas & Errores
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Gráficos combinados de Cargas Totales vs Cargas Observadas y control descriptivo completo.
          </p>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem', width: '100%' }}
            placeholder="Buscar Distribuidor, Producto, Motivo..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--coca-red)', fontWeight: 700, fontSize: '0.875rem' }}>
          <Filter size={18} /> FILTROS FECHAS Y USUARIOS:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Fecha Mercado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FECHA MERCADO:</span>
            <input
              type="date"
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
              value={filters.mercadoDateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, mercadoDateStart: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>a</span>
            <input
              type="date"
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
              value={filters.mercadoDateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, mercadoDateEnd: e.target.value }))}
            />
          </div>

          {/* Fecha Bodega */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#60A5FA' }}>FECHA BODEGA:</span>
            <input
              type="date"
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
              value={filters.bodegaDateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, bodegaDateStart: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>a</span>
            <input
              type="date"
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
              value={filters.bodegaDateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, bodegaDateEnd: e.target.value }))}
            />
          </div>

          {/* Tipo Error */}
          <select
            className="form-control"
            value={filters.errorType}
            onChange={(e) => setFilters(prev => ({ ...prev, errorType: e.target.value }))}
          >
            <option value="TODOS">Todos los Errores</option>
            <option value="Faltante">Faltante</option>
            <option value="Sobrante">Sobrante</option>
            <option value="Cruce">Cruce</option>
            <option value="Vacía">Vacía</option>
          </select>

          {/* Asesor / Usuario */}
          <select
            className="form-control"
            value={filters.advisor}
            onChange={(e) => setFilters(prev => ({ ...prev, advisor: e.target.value }))}
            style={{ maxWidth: '180px' }}
          >
            <option value="TODOS">Todos los Asesores/Usuarios</option>
            {(allAdvisors || []).map(adv => (
              <option key={adv} value={adv}>{adv}</option>
            ))}
          </select>

          <button 
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setFilters({
              mercadoDateStart: '',
              mercadoDateEnd: '',
              bodegaDateStart: '',
              bodegaDateEnd: '',
              errorType: 'TODOS',
              advisor: 'TODOS',
              searchQuery: ''
            })}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Quantities & Percentages KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card blue">
          <div className="kpi-title">TOTAL CARGAS DESPACHADAS</div>
          <div className="kpi-value">{metrics.totalCargas.toLocaleString()}</div>
          <div className="kpi-sub" style={{ color: '#60A5FA', fontWeight: 600 }}>100% de operaciones de carga</div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-title">ERRORES DE MERCADO (CANTIDAD Y %)</div>
          <div className="kpi-value" style={{ color: '#FF5252' }}>
            {metrics.totalMercado.toLocaleString()}
          </div>
          <div className="kpi-sub" style={{ color: '#FF5252', fontWeight: 700 }}>
            {metrics.mercadoPct}% del total de discrepancias
          </div>
        </div>

        <div className="glass-card kpi-card guindo">
          <div className="kpi-title">ERRORES DE BODEGA (CANTIDAD Y %)</div>
          <div className="kpi-value" style={{ color: '#F472B6' }}>
            {metrics.totalBodegaObs.toLocaleString()}
          </div>
          <div className="kpi-sub" style={{ color: '#F472B6', fontWeight: 700 }}>
            {metrics.bodegaPct}% del total de discrepancias
          </div>
        </div>

        <div className="glass-card kpi-card amber">
          <div className="kpi-title">CARGAS OBSERVADAS (CANTIDAD Y %)</div>
          <div className="kpi-value" style={{ color: '#FBBF24' }}>
            {metrics.cargasObservadasCount.toLocaleString()}
          </div>
          <div className="kpi-sub" style={{ color: '#FBBF24', fontWeight: 700 }}>
            {metrics.cargasObservadasPct}% de cargas con novedades
          </div>
        </div>
      </div>

      {/* Page 1 Combination Chart: Barras = Cantidad de Cargas, Linea = Cargas Observadas */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <TrendingUp size={20} color="#E61D2B" />
            Gráficos Combinados: Barras = Cantidad de Cargas | Línea = Cargas Observadas
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Evolución diaria por fecha
          </span>
        </div>
        <div className="card-body">
          {chartData.categories.length > 0 ? (
            <Chart options={chartOptions} series={chartSeries} type="line" height={380} />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay datos para el rango de fechas seleccionado
            </div>
          )}
        </div>
      </div>

      {/* Required Table Structure */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={20} color="#E61D2B" />
            Tabla Descriptiva de Errores ({totalRecords.toLocaleString()} registros)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mostrar:</span>
            <select
              className="form-control"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={15}>15 por pág.</option>
              <option value={30}>30 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>MES</th>
                  <th>DÍA / FECHA</th>
                  <th>DISTRIBUIDOR / ASESOR</th>
                  <th>PRODUCTO ESPERADO</th>
                  <th>MOTIVO DEL REPORTE</th>
                  <th>CANTIDAD</th>
                  <th>PRODUCTO ENTREGADO</th>
                  <th>CLASIFICACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((r, i) => (
                    <tr key={r.id || i}>
                      <td style={{ fontWeight: 600, color: '#60A5FA' }}>{r.mes || 'Junio 2026'}</td>
                      <td style={{ fontWeight: 600 }}>{r.dia || r.fecha}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {r.distribuidor || r.asesor || 'Asesor Registrado'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#F1F5F9' }}>
                        {r.producto_esperado}
                      </td>
                      <td style={{ fontWeight: 700, color: '#E61D2B' }}>
                        {r.motivo}
                      </td>
                      <td style={{ fontWeight: 800, color: '#FBBF24' }}>
                        {r.cantidad} {r.unidad}
                      </td>
                      <td>
                        {r.producto_entregado && r.producto_entregado !== '-' ? (
                          <span style={{ fontWeight: 600, color: '#34D399' }}>
                            {r.producto_entregado}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>
                      <td>{renderTypeBadge(r.tipo_clasificacion || r.motivo)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No se encontraron errores registrados para los filtros actuales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} de {totalRecords.toLocaleString()} registros
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Anterior
              </button>

              <span style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                {currentPage} / {totalPages}
              </span>

              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

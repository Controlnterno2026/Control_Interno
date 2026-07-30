import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import { getVSMetrics, getTraceabilityRecords } from '../utils/dataProcessor';
import { 
  GitCompare, 
  ShieldCheck, 
  Truck, 
  Search, 
} from 'lucide-react';

export default function Page2TrazabilidadVS({ filteredData }) {
  const [searchTruck, setSearchTruck] = useState('');

  const { mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes } = filteredData;

  // Calculate VS Metrics
  const vsMetrics = getVSMetrics(mercado, bodega_observaciones, bodega_faltantes_sobrantes);

  // Generate traceability records linking Mercado & Bodega
  const traceRecords = getTraceabilityRecords(mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes);

  // Filter trace records by truck search
  const filteredTrace = traceRecords.filter(t => {
    if (!searchTruck) return true;
    const q = searchTruck.toLowerCase().trim();
    return String(t.camion).toLowerCase().includes(q) || 
           String(t.viaje).toLowerCase().includes(q) ||
           String(t.fecha).includes(q) ||
           String(t.usuario_bodega || '').toLowerCase().includes(q) ||
           String(t.usuario_control || '').toLowerCase().includes(q);
  });

  // Donut Chart VS Options
  const vsDonutOptions = {
    chart: { type: 'donut', background: 'transparent' },
    theme: { mode: 'dark' },
    labels: ['Errores de Mercado', 'Errores de Bodega (Control Interno)'],
    colors: ['#E61D2B', '#2563EB'],
    legend: { position: 'bottom', labels: { colors: '#F1F5F9' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Errores',
              color: '#94A3B8',
              formatter: () => `${vsMetrics.totalMercado + vsMetrics.totalBodega}`
            }
          }
        }
      }
    }
  };

  const vsDonutSeries = [vsMetrics.totalMercado, vsMetrics.totalBodega];

  // New High-Value Control Feature: Detección Preventiva de Control Interno (Preventive Error Detection)
  const caughtInBodegaCount = bodega_observaciones.length + bodega_faltantes_sobrantes.length;
  const missedToMercadoCount = mercado.length;

  const preventiveChartOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: 'dark' },
    plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '50%' } },
    colors: ['#22C55E', '#EF4444'],
    xaxis: { categories: ['Control Preventivo Bodega', 'Reclamos Posteriores Mercado'] },
    dataLabels: { enabled: true, formatter: (val) => `${val} incidentes` },
    grid: { borderColor: 'rgba(255, 255, 255, 0.08)' }
  };

  const preventiveSeries = [
    { name: 'Volumen de Incidentes', data: [caughtInBodegaCount, missedToMercadoCount] }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
          Control Interno (Bodega) VS Errores de Mercado & Trazabilidad
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Auditoría de usuarios responsables, trazabilidad de cargas e inspección completa por camión y viaje.
        </p>
      </div>

      {/* VS Executive Dashboard Summary Cards */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card" style={{ borderLeftColor: '#E61D2B' }}>
          <div className="kpi-title">ERRORES DE MERCADO (CANTIDAD Y %)</div>
          <div className="kpi-value" style={{ color: '#FF5252' }}>{vsMetrics.totalMercado.toLocaleString()}</div>
          <div className="kpi-sub" style={{ color: '#FF5252', fontWeight: 700 }}>
            {vsMetrics.mercadoPct}% del total de errores
          </div>
          <div className="kpi-sub">Reportes recibidos en distribución</div>
        </div>

        <div className="glass-card kpi-card blue">
          <div className="kpi-title">ERRORES DE BODEGA (CANTIDAD Y %)</div>
          <div className="kpi-value" style={{ color: '#60A5FA' }}>{vsMetrics.totalBodega.toLocaleString()}</div>
          <div className="kpi-sub" style={{ color: '#60A5FA', fontWeight: 700 }}>
            {vsMetrics.bodegaPct}% del total de errores
          </div>
          <div className="kpi-sub">Faltantes / Sobrantes corregidos en bodega</div>
        </div>

        <div className="glass-card kpi-card amber">
          <div className="kpi-title">MAYOR REGISTRO DE ERRORES</div>
          <div className="kpi-value" style={{ fontSize: '1.5rem', color: '#FBBF24' }}>
            {vsMetrics.totalMercado > vsMetrics.totalBodega ? 'MERCADO (DISTRIBUCIÓN)' : 'BODEGA (PICKING)'}
          </div>
          <div className="kpi-sub">Área con mayor volumen de discrepancias</div>
        </div>

        <div className="glass-card kpi-card green">
          <div className="kpi-title">EFICIENCIA AUDITORÍA PREVENTIVA</div>
          <div className="kpi-value" style={{ color: '#4ADE80' }}>
            {caughtInBodegaCount + missedToMercadoCount > 0 ? ((caughtInBodegaCount / (caughtInBodegaCount + missedToMercadoCount)) * 100).toFixed(1) : 0}%
          </div>
          <div className="kpi-sub">Errores detectados antes de la salida</div>
        </div>
      </div>

      {/* VS Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Donut Chart: Bodega vs Mercado */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <GitCompare size={20} color="#E61D2B" />
              Proporción de Errores: Bodega VS Mercado
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <Chart options={vsDonutOptions} series={vsDonutSeries} type="donut" width={380} />
          </div>
        </div>

        {/* High-Value Internal Control Panel: Preventive Detection */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={20} color="#22C55E" />
              Auditoría Preventiva: Errores Atrapados en Bodega VS Escapados a Mercado
            </div>
          </div>
          <div className="card-body">
            <Chart options={preventiveChartOptions} series={preventiveSeries} type="bar" height={260} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Muestra cuántos descuadres logró frenar el equipo de Control Interno antes del despacho.
            </div>
          </div>
        </div>

      </div>

      {/* Traceability Explorer Section */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Truck size={20} color="#60A5FA" />
            Matriz de Trazabilidad Unificada por Camión y Usuarios
          </div>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.8rem' }}
              placeholder="Buscar N° Camión, Operador..."
              value={searchTruck}
              onChange={(e) => setSearchTruck(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.55 }}>
            Esta tabla permite auditar exactamente <strong style={{ color: '#fff' }}>quién armó el pallet</strong>, <strong style={{ color: '#fff' }}>quién realizó el control interno</strong> y <strong style={{ color: '#fff' }}>quién despachó la carga</strong>, junto con el estado y una breve descripción de sus observaciones.
          </p>

          <div className="table-container">
            <table className="custom-table traceability-table">
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>CAMIÓN / VIAJE</th>
                  <th>QUIÉN ARMÓ EL PALLET</th>
                  <th>QUIÉN HIZO EL CONTROL</th>
                  <th>QUIÉN DESPACHÓ LA CARGA</th>
                  <th>OBSERVACIONES BODEGA</th>
                  <th>REPORTES MERCADO</th>
                  <th>ESTADO / DESCRIPCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrace.length > 0 ? (
                  filteredTrace.map((t, idx) => {
                    const hasMercado = t.mercado_reports.length > 0;
                    const hasBodegaObs = t.observaciones_bodega.length > 0;
                    const reportCount = t.mercado_reports.length + t.observaciones_bodega.length;
                    const reportDescription = [
                      ...t.mercado_reports.map(m => {
                        const observation = String(m.observacion || '').trim();
                        return observation && !['nan', 'none', '-'].includes(observation.toLowerCase())
                          ? observation
                          : m.motivo || 'Reporte de Mercado';
                      }),
                      ...t.observaciones_bodega.map(o => o.descripcion || `${o.tipo_fs || 'Hallazgo'}${o.cajas ? ` de ${o.cajas} cajas` : ''}`)
                    ].filter(Boolean).slice(0, 2).join(' | ');

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{t.fecha}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#60A5FA' }}>
                            <Truck size={14} /> #{t.camion} ({t.viaje})
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{t.usuario_bodega || 'Sin dato'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Picking / Armado</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#F59E0B' }}>{t.usuario_control || 'Sin dato'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Control Interno</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{t.usuario_despacho || 'Sin dato'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Despacho</div>
                        </td>
                        <td>
                          {hasBodegaObs ? (
                            <span className="badge badge-cruce">{t.observaciones_bodega.length} Novedades</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sin novedad</span>
                          )}
                        </td>
                        <td>
                          {hasMercado ? (
                            <span className="badge badge-faltante">{t.mercado_reports.length} Reclamos</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sin reportes</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: reportCount > 0 ? '#FBBF24' : '#4ADE80', fontSize: '0.75rem' }}>
                            {reportCount > 0 ? `Reportó ${reportCount} novedad${reportCount === 1 ? '' : 'es'}` : 'No reportó novedades'}
                          </div>
                          <div style={{ marginTop: '0.35rem', color: reportCount > 0 ? '#E2E8F0' : 'var(--text-dim)', fontSize: '0.72rem', lineHeight: 1.35 }}>
                            {reportDescription || 'Sin descripción de novedades'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No hay registros de trazabilidad para el criterio de búsqueda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
}

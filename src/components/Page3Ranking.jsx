import React from 'react';
import Chart from 'react-apexcharts';
import { getAdvisorRanking, getCombinedChartData } from '../utils/dataProcessor';
import { 
  Trophy, 
  Users, 
  Calendar,
  Box
} from 'lucide-react';

export default function Page3Ranking({ filteredData }) {
  const { mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes } = filteredData;

  // Advisor Rankings and critical products
  const { allAdvisors, top5Active, top5CriticalProducts } = getAdvisorRanking(mercado, bodega_camiones, bodega_observaciones, bodega_faltantes_sobrantes);

  // Daily Trend Timeline
  const dailyTimeline = getCombinedChartData(mercado, bodega_observaciones, bodega_faltantes_sobrantes);

  // Daily Trend Area Chart
  const trendLineOptions = {
    chart: { type: 'area', height: 300, toolbar: { show: true }, background: 'transparent' },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#E61D2B', '#60A5FA'],
    fill: {
      type: 'gradient',
      gradient: { shade: 'dark', type: 'vertical', opacityFrom: 0.55, opacityTo: 0.05 }
    },
    xaxis: { categories: dailyTimeline.categories, labels: { style: { colors: '#94A3B8', fontSize: '10px' } } },
    yaxis: { labels: { style: { colors: '#F1F5F9' } } },
    grid: { borderColor: 'rgba(255, 255, 255, 0.08)' }
  };

  const trendLineSeries = [
    { name: 'Tendencia Mercado', data: dailyTimeline.mercadoSeries },
    { name: 'Tendencia Bodega', data: dailyTimeline.bodegaSeries }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
          Ranking de Asesores & Control de Productos Críticos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Clasificación de usuarios, productos críticos y evolución diaria de incidencias.
        </p>
      </div>

      {/* Top 5 Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        
        {/* TOP 5 Asesores / Usuarios con Más Registros */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Trophy size={20} color="#FBBF24" />
              TOP 5: Asesores / Usuarios con Mayor Volumen de Registro
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {top5Active.map((adv, idx) => (
                <div 
                  key={adv.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: idx === 0 ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: idx === 0 ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#FBBF24' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : 'rgba(255,255,255,0.1)',
                      color: idx <= 2 ? '#000' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{adv.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Total Operaciones Controladas: {adv.totalRegistros}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: '#60A5FA' }}>
                      {adv.totalRegistros}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)' }}>REGISTROS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOP 5 Productos Críticos con Más Faltantes y Sobrantes en Bodega */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Box size={20} color="#E61D2B" />
              TOP 5: Productos Críticos con Más Faltantes / Sobrantes
            </div>
            <span className="badge badge-faltante">EXCLUSIVO BODEGA</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {top5CriticalProducts.map((prod, idx) => (
                <div 
                  key={prod.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: idx === 0 ? 'rgba(230, 29, 43, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: idx === 0 ? '1px solid rgba(230, 29, 43, 0.3)' : '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#E61D2B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Tipo principal: {prod.tipo}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: '#FF5252' }}>
                      {prod.count}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)' }}>INCIDENCIAS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Daily Trend Timeline Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <Calendar size={20} color="#E61D2B" />
              Gráfico de líneas: Mercado vs Bodega por día
            </div>
          </div>
          <div className="card-body">
            {dailyTimeline.categories.length > 0 ? (
              <Chart options={trendLineOptions} series={trendLineSeries} type="area" height={280} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin datos de evolución diaria</div>
            )}
            <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Este gráfico compara día a día los reportes de <strong style={{ color: '#FF5252' }}>Mercado</strong> y las novedades de <strong style={{ color: '#60A5FA' }}>Bodega</strong>. Un pico indica una fecha con más incidencias; cuando ambas líneas suben, conviene revisar esa jornada en la matriz de trazabilidad.
            </p>
          </div>
        </div>

      </div>

      {/* Advisor Performance Table (Cleaned Columns) */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Users size={20} color="#60A5FA" />
            Tabla de Desempeño por Asesor / Usuario ({allAdvisors.length} registrados)
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>RANKING</th>
                  <th>ASESOR / OPERADOR</th>
                  <th>TOTAL OPERACIONES</th>
                  <th>OBSERVACIONES / ERRORES DETECTADOS</th>
                  <th>ESTATUS BODEGA</th>
                </tr>
              </thead>
              <tbody>
                {allAdvisors.slice(0, 30).map((adv, idx) => {
                  const hasObs = adv.observacionesDetalle.length > 0;
                  const sampleObs = hasObs ? adv.observacionesDetalle.slice(0, 2).join(' | ') : 'Sin observaciones reportadas';

                  return (
                    <tr key={adv.name}>
                      <td style={{ fontWeight: 800, color: idx < 5 ? '#FBBF24' : 'var(--text-muted)' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{adv.name}</td>
                      <td style={{ fontWeight: 800, color: '#60A5FA' }}>{adv.totalRegistros}</td>
                      <td style={{ fontSize: '0.8rem', color: hasObs ? '#FF5252' : 'var(--text-muted)', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sampleObs}
                      </td>
                      <td>
                        {hasObs ? (
                          <span className="badge badge-cruce">{adv.observacionesDetalle.length} Novedades</span>
                        ) : (
                          <span className="badge badge-sobrante">SIN ERRORES</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

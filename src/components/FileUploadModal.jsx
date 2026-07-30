import React, { useState } from 'react';
import { parseUploadedExcelFile } from '../utils/dataProcessor';
import { UploadCloud, X, CheckCircle, AlertCircle, FolderPlus, Calendar, HardDrive, AlertTriangle, Trash2 } from 'lucide-react';

export default function FileUploadModal({ isOpen, onClose, onDataUploaded, onDatesDeleted, loadedFiles, availableDates }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleteStatus, setDeleteStatus] = useState(null);

  if (!isOpen) return null;

  const existingFileNames = (loadedFiles || []).map(f => f.fileName.toLowerCase());
  const availableDateValues = [
    availableDates?.mercado_start,
    availableDates?.mercado_end,
    availableDates?.bodega_start,
    availableDates?.bodega_end
  ].filter(Boolean).sort();

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadStatus(null);

    let totalMercadoAdded = 0;
    let totalBodegaAdded = 0;
    let processedFiles = 0;
    let repeatedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();

        // Check if file is repeated
        if (existingFileNames.includes(lowerName)) {
          repeatedFiles.push(file.name);
          continue;
        }

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
          const res = await parseUploadedExcelFile(file);
          const mercadoCount = res.mercado?.length || 0;
          const camionesCount = res.bodega_camiones?.length || 0;
          const observacionesCount = res.bodega_observaciones?.length || 0;
          const faltantesCount = res.bodega_faltantes_sobrantes?.length || 0;

          if (mercadoCount > 0 || camionesCount > 0 || observacionesCount > 0 || faltantesCount > 0) {
            onDataUploaded(res);
            totalMercadoAdded += mercadoCount;
            totalBodegaAdded += camionesCount + observacionesCount + faltantesCount;
            processedFiles++;
          }
        }
      }

      if (repeatedFiles.length > 0 && processedFiles === 0) {
        setUploadStatus({
          type: 'warning',
          message: `⚠️ Archivos Repetidos: [${repeatedFiles.join(', ')}] ya fueron cargados anteriormente.`
        });
      } else if (repeatedFiles.length > 0) {
        setUploadStatus({
          type: 'warning',
          message: `Se procesaron ${processedFiles} archivos. ⚠️ Omisión de repetidos: [${repeatedFiles.join(', ')}] ya existían.`
        });
      } else {
        setUploadStatus({
          type: 'success',
          message: `¡Carga exitosa! Se procesaron ${processedFiles} archivos nuevos (${totalMercadoAdded} reg. Mercado, ${totalBodegaAdded} reg. Bodega).`
        });
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({
        type: 'error',
        message: `Error al procesar archivos: ${err.message || 'Formato Excel no válido'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDeleteDates = () => {
    if (!deleteStartDate) {
      setDeleteStatus({
        type: 'error',
        message: 'Selecciona al menos una fecha para borrar.'
      });
      return;
    }

    const endDate = deleteEndDate || deleteStartDate;
    const summary = onDatesDeleted?.(deleteStartDate, endDate) || { total: 0 };
    const rangeLabel = deleteStartDate === endDate ? deleteStartDate : `${deleteStartDate} a ${endDate}`;

    if (summary.total > 0) {
      setDeleteStatus({
        type: 'success',
        message: `Fechas borradas (${rangeLabel}): ${summary.total.toLocaleString()} registros removidos.`
      });
    } else {
      setDeleteStatus({
        type: 'warning',
        message: `No habia registros para borrar en ${rangeLabel}.`
      });
    }
  };

  const handleDeleteAllDates = () => {
    if (availableDateValues.length === 0) {
      setDeleteStatus({
        type: 'warning',
        message: 'No hay fechas cargadas para borrar.'
      });
      return;
    }

    const startDate = availableDateValues[0];
    const endDate = availableDateValues[availableDateValues.length - 1];
    const confirmed = window.confirm(`Se borrarán todas las fechas desde ${startDate} hasta ${endDate}. ¿Deseas continuar?`);
    if (!confirmed) return;

    const summary = onDatesDeleted?.(startDate, endDate) || { total: 0 };
    setDeleteStartDate(startDate);
    setDeleteEndDate(endDate);
    setDeleteStatus({
      type: summary.total > 0 ? 'success' : 'warning',
      message: summary.total > 0
        ? `Todas las fechas fueron borradas: ${summary.total.toLocaleString()} registros removidos.`
        : 'No habia registros para borrar.'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="card-header">
          <div className="card-title">
            <UploadCloud size={22} color="#E61D2B" />
            Gestión de Archivos & Fechas Disponibles
          </div>
          <button className="btn btn-outline" style={{ padding: '0.3rem', borderRadius: '50%' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Fechas Disponibles Summary Banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(230,29,43,0.15) 0%, rgba(15,76,129,0.2) 100%)', border: '1px solid rgba(230,29,43,0.3)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} color="#FBBF24" /> Fechas Disponibles en el Sistema
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>RANGO MERCADO:</span>
                <strong style={{ color: '#FF5252' }}>
                  {availableDates?.mercado_start || '2024-01-02'} a {availableDates?.mercado_end || '2026-06-29'}
                </strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>RANGO BODEGA (DIARIOS):</span>
                <strong style={{ color: '#60A5FA' }}>
                  {availableDates?.bodega_start || '2026-05-02'} a {availableDates?.bodega_end || '2026-06-29'}
                </strong>
              </div>
            </div>
          </div>

          {/* Delete Dates Section */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Trash2 size={18} color="#FCA5A5" /> Borrar fechas que no quiero
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                DESDE
                <input
                  type="date"
                  className="form-control"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                HASTA
                <input
                  type="date"
                  className="form-control"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                />
              </label>

              <button
                className="btn btn-primary"
                style={{ minHeight: '42px' }}
                onClick={handleDeleteDates}
              >
                <Trash2 size={16} />
                Borrar fechas
              </button>

              <button
                className="btn btn-outline"
                style={{ minHeight: '42px', color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.5)' }}
                onClick={handleDeleteAllDates}
              >
                <Trash2 size={16} />
                Borrar todas las fechas
              </button>
            </div>

            {deleteStatus && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: deleteStatus.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : deleteStatus.type === 'warning' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.15)',
                border: deleteStatus.type === 'success' ? '1px solid rgba(34, 197, 94, 0.4)' : deleteStatus.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: deleteStatus.type === 'success' ? '#4ADE80' : deleteStatus.type === 'warning' ? '#FBBF24' : '#FCA5A5'
              }}>
                {deleteStatus.type === 'success' ? <CheckCircle size={18} /> : deleteStatus.type === 'warning' ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
                {deleteStatus.message}
              </div>
            )}
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed #E61D2B' : '2px dashed var(--border-light)',
              background: isDragging ? 'rgba(230, 29, 43, 0.1)' : 'rgba(15, 20, 30, 0.6)',
              borderRadius: '16px',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onClick={() => document.getElementById('fileInputModal').click()}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(230,29,43,0.2) 0%, rgba(110,13,25,0.4) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E61D2B'
            }}>
              <FolderPlus size={28} />
            </div>

            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                Subir nuevos reportes Excel o carpeta mensual
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Si el archivo ya fue subido anteriormente, el sistema advertirá que está **repetido**.
              </div>
            </div>

            <input
              id="fileInputModal"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(Array.from(e.target.files))}
            />
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.4)', borderRadius: '8px', color: '#60A5FA', fontSize: '0.85rem' }}>
              Procesando y agregando archivos Excel...
            </div>
          )}

          {/* Upload Status Notification */}
          {uploadStatus && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: uploadStatus.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : uploadStatus.type === 'warning' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.15)',
              border: uploadStatus.type === 'success' ? '1px solid rgba(34, 197, 94, 0.4)' : uploadStatus.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
              color: uploadStatus.type === 'success' ? '#4ADE80' : uploadStatus.type === 'warning' ? '#FBBF24' : '#FCA5A5'
            }}>
              {uploadStatus.type === 'success' ? <CheckCircle size={18} /> : uploadStatus.type === 'warning' ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
              {uploadStatus.message}
            </div>
          )}

          {/* Loaded Files Directory List */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HardDrive size={16} color="#60A5FA" /> Inventario de Archivos Cargados en Sistema ({loadedFiles?.length || 0})
            </h4>

            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(10, 14, 20, 0.8)' }}>
              <table className="custom-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>NOMBRE DEL ARCHIVO</th>
                    <th>TIPO DE REPORTE</th>
                    <th>REGISTROS</th>
                    <th>COBERTURA FECHAS</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {(loadedFiles || []).slice(0, 15).map((f, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{f.fileName}</td>
                      <td>
                        <span className={f.fileType.includes('Mercado') ? 'badge badge-faltante' : 'badge badge-blue'}>
                          {f.fileType}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{f.recordsCount.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {f.startDate ? `${f.startDate} a ${f.endDate}` : 'Rango Activo'}
                      </td>
                      <td>
                        <span className="badge badge-procede" style={{ fontSize: '0.65rem' }}>CARGADO</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={onClose}>
              <CheckCircle size={17} />
              Listo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

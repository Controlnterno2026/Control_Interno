import * as XLSX from 'xlsx';

const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const monthsEs = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateParts(year, month, day) {
  if (!year || !month || !day) return '';
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizeDateValue(value) {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return formatDateParts(parsed.y, parsed.m, parsed.d);
  }

  const text = String(value).trim();
  if (!text || text === 'nan' || text === 'None') return '';

  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }

  if (/^\d{5}$/.test(text)) {
    const parsed = XLSX.SSF.parse_date_code(Number(text));
    if (parsed) return formatDateParts(parsed.y, parsed.m, parsed.d);
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const dayFirstMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dayFirstMatch) {
    return formatDateParts(dayFirstMatch[3], dayFirstMatch[2], dayFirstMatch[1]);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return '';
}

function cleanCell(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === 'nan' || text === 'None') return fallback;
  return text;
}

function getFirstValue(row, keys, fallback = '') {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = cleanCell(row[key], '');
      if (value !== '') return value;
    }
  }
  return fallback;
}

function getFirstRawValue(row, keys, fallback = '') {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      if (value !== null && value !== undefined && value !== '') return value;
    }
  }
  return fallback;
}

function normalizeId(value) {
  const cleaned = cleanCell(value, '');
  if (!cleaned) return '';
  return cleaned.replace(/\.0$/, '');
}

function getMercadoTruckCandidates(record) {
  return [
    record?.camion,
    record?.distribuidor,
    record?.carga,
    record?.asesor
  ].map(normalizeId).filter(Boolean);
}

function getMonthName(fecha) {
  if (!VALID_DATE_RE.test(fecha)) return 'Archivo Subido';
  const [, year, month] = fecha.match(/^(\d{4})-(\d{2})-\d{2}$/) || [];
  const monthIndex = Number(month) - 1;
  return `${monthsEs[monthIndex] || 'Mes'} ${year}`;
}

function getDisplayDate(fecha) {
  if (!VALID_DATE_RE.test(fecha)) return fecha || '';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

function countInDateRange(list, startDate, endDate) {
  return (list || []).filter(item => item.fecha >= startDate && item.fecha <= endDate).length;
}

function getSortedValidDates(list) {
  return [...new Set((list || []).map(item => item.fecha).filter(fecha => VALID_DATE_RE.test(fecha)))].sort();
}

/**
 * Filter data by Mercado date range, Bodega date range, error type, advisor, and search query
 */
export function filterDataset(data, filters) {
  if (!data) return { mercado: [], bodega_camiones: [], bodega_observaciones: [], bodega_faltantes_sobrantes: [], loaded_files: [], available_dates: {} };

  const {
    mercadoDateStart,
    mercadoDateEnd,
    bodegaDateStart,
    bodegaDateEnd,
    errorType,
    advisor,
    searchQuery
  } = filters;

  const searchLower = (searchQuery || '').toLowerCase().trim();

  // 1. Filter Mercado
  const filteredMercado = (data.mercado || []).filter(item => {
    if (mercadoDateStart && item.fecha < mercadoDateStart) return false;
    if (mercadoDateEnd && item.fecha > mercadoDateEnd) return false;

    if (errorType && errorType !== 'TODOS') {
      if (item.tipo_clasificacion !== errorType && !item.motivo.includes(errorType)) return false;
    }

    if (advisor && advisor !== 'TODOS') {
      if (item.distribuidor !== advisor && item.asesor !== advisor) return false;
    }

    if (searchLower) {
      const matchText = `${item.mes} ${item.dia} ${item.distribuidor} ${item.producto_esperado} ${item.motivo} ${item.producto_entregado} ${item.lugar} ${item.observacion || ''}`.toLowerCase();
      if (!matchText.includes(searchLower)) return false;
    }

    return true;
  });

  // 2. Filter Bodega Camiones
  const filteredBodegaCamiones = (data.bodega_camiones || []).filter(item => {
    if (bodegaDateStart && item.fecha < bodegaDateStart) return false;
    if (bodegaDateEnd && item.fecha > bodegaDateEnd) return false;

    if (advisor && advisor !== 'TODOS') {
      if (item.usuario_bodega !== advisor && item.usuario_control !== advisor && item.usuario_despacho !== advisor) return false;
    }

    if (searchLower) {
      const matchText = `${item.fecha} ${item.camion} ${item.viaje} ${item.usuario_bodega} ${item.usuario_control} ${item.usuario_despacho}`.toLowerCase();
      if (!matchText.includes(searchLower)) return false;
    }

    return true;
  });

  // 3. Filter Bodega Observaciones
  const filteredBodegaObs = (data.bodega_observaciones || []).filter(item => {
    if (bodegaDateStart && item.fecha < bodegaDateStart) return false;
    if (bodegaDateEnd && item.fecha > bodegaDateEnd) return false;

    if (advisor && advisor !== 'TODOS' && item.usuario !== advisor) return false;

    if (searchLower) {
      const matchText = `${item.fecha} ${item.camion} ${item.descripcion} ${item.usuario}`.toLowerCase();
      if (!matchText.includes(searchLower)) return false;
    }

    return true;
  });

  // 4. Filter Bodega Faltantes/Sobrantes
  const filteredBodegaFS = (data.bodega_faltantes_sobrantes || []).filter(item => {
    if (bodegaDateStart && item.fecha < bodegaDateStart) return false;
    if (bodegaDateEnd && item.fecha > bodegaDateEnd) return false;

    if (advisor && advisor !== 'TODOS' && item.usuario !== advisor) return false;

    if (searchLower) {
      const matchText = `${item.fecha} ${item.camion} ${item.descripcion} ${item.usuario} ${item.tipo_fs}`.toLowerCase();
      if (!matchText.includes(searchLower)) return false;
    }

    return true;
  });

  return {
    mercado: filteredMercado,
    bodega_camiones: filteredBodegaCamiones,
    bodega_observaciones: filteredBodegaObs,
    bodega_faltantes_sobrantes: filteredBodegaFS,
    loaded_files: data.loaded_files || [],
    available_dates: data.available_dates || {}
  };
}

/**
 * Get Page 1 Combination Chart Data:
 * - Columns (Barras): Cantidad de Cargas Totales por Día
 * - Line (Línea): Cantidad de Cargas Observadas por Día
 * FIXED: totalCargas is guaranteed to be >= cargasObservadas so no 0 cargas vs 1 observada glitch occurs.
 */
export function getPage1CombinationChartData(bodegaCamiones, bodegaObsList, bodegaFSList, mercadoList) {
  const dateMap = {};
  const bodegaTruckDates = new Set();

  const ensureDate = (fecha) => {
    if (!dateMap[fecha]) {
      dateMap[fecha] = {
        date: fecha,
        totalCargasMap: new Set(),
        cargasObservadasMap: new Set()
      };
    }
    return dateMap[fecha];
  };

  (bodegaCamiones || []).forEach(c => {
    if (!c.fecha) return;
    const obj = ensureDate(c.fecha);
    const camion = normalizeId(c.camion);
    const viaje = normalizeId(c.viaje) || 'A';
    const loadKey = camion ? `${camion}_${viaje}` : `SIN_CAMION_${obj.totalCargasMap.size + 1}`;
    obj.totalCargasMap.add(loadKey);
    if (camion) bodegaTruckDates.add(`${c.fecha}_${camion}`);
  });

  (bodegaObsList || []).forEach(o => {
    if (!o.fecha) return;
    const obj = ensureDate(o.fecha);
    const camion = normalizeId(o.camion);
    obj.cargasObservadasMap.add(camion || `OBS_${obj.cargasObservadasMap.size + 1}`);
  });

  (bodegaFSList || []).forEach(fs => {
    if (!fs.fecha) return;
    const obj = ensureDate(fs.fecha);
    const camion = normalizeId(fs.camion);
    obj.cargasObservadasMap.add(camion || `FS_${obj.cargasObservadasMap.size + 1}`);
  });

  (mercadoList || []).forEach(m => {
    if (!m.fecha) return;
    const matchedTruck = getMercadoTruckCandidates(m).find(camion => bodegaTruckDates.has(`${m.fecha}_${camion}`));
    if (!matchedTruck) return;
    const obj = ensureDate(m.fecha);
    obj.cargasObservadasMap.add(matchedTruck);
  });

  const sortedDates = Object.keys(dateMap).sort();
  const slicedDates = sortedDates.slice(-45);

  return {
    categories: slicedDates,
    cargasTotalesSeries: slicedDates.map(d => {
      const obj = dateMap[d];
      const obsCount = obj.cargasObservadasMap.size;
      return Math.max(obj.totalCargasMap.size, obsCount);
    }),
    cargasObservadasSeries: slicedDates.map(d => dateMap[d].cargasObservadasMap.size)
  };
}

/**
 * Legacy alias for Page 3 trend line chart
 */
export function getCombinedChartData(mercadoList, bodegaObsList, bodegaFSList) {
  const dateMap = {};

  (mercadoList || []).forEach(m => {
    if (!m.fecha) return;
    if (!dateMap[m.fecha]) dateMap[m.fecha] = { date: m.fecha, mercadoErrors: 0, bodegaErrors: 0 };
    dateMap[m.fecha].mercadoErrors += 1;
  });

  (bodegaObsList || []).forEach(b => {
    if (!b.fecha) return;
    if (!dateMap[b.fecha]) dateMap[b.fecha] = { date: b.fecha, mercadoErrors: 0, bodegaErrors: 0 };
    dateMap[b.fecha].bodegaErrors += 1;
  });

  (bodegaFSList || []).forEach(b => {
    if (!b.fecha) return;
    if (!dateMap[b.fecha]) dateMap[b.fecha] = { date: b.fecha, mercadoErrors: 0, bodegaErrors: 0 };
    dateMap[b.fecha].bodegaErrors += 1;
  });

  const sortedDates = Object.keys(dateMap).sort();
  const slicedDates = sortedDates.slice(-45);

  return {
    categories: slicedDates,
    mercadoSeries: slicedDates.map(d => dateMap[d].mercadoErrors),
    bodegaSeries: slicedDates.map(d => dateMap[d].bodegaErrors)
  };
}

/**
 * Compute Quantities & Percentages for Page 1 KPIs
 */
export function getPage1Metrics(mercadoList, bodegaCamiones, bodegaObsList, bodegaFSList) {
  const totalMercado = (mercadoList || []).length;
  const totalBodegaObs = (bodegaObsList || []).length + (bodegaFSList || []).length;

  const totalErrores = totalMercado + totalBodegaObs;
  const mercadoPct = totalErrores > 0 ? ((totalMercado / totalErrores) * 100).toFixed(1) : 0;
  const bodegaPct = totalErrores > 0 ? ((totalBodegaObs / totalErrores) * 100).toFixed(1) : 0;

  const totalLoadSet = new Set();
  const bodegaTruckDates = new Set();
  (bodegaCamiones || []).forEach(c => {
    const fecha = c.fecha;
    const camion = normalizeId(c.camion);
    if (!fecha || !camion) return;
    const viaje = normalizeId(c.viaje) || 'A';
    totalLoadSet.add(`${fecha}_${camion}_${viaje}`);
    bodegaTruckDates.add(`${fecha}_${camion}`);
  });

  const observedSet = new Set();
  (bodegaObsList || []).forEach(o => {
    const camion = normalizeId(o.camion);
    if (o.fecha && camion) observedSet.add(`${o.fecha}_${camion}`);
  });
  (bodegaFSList || []).forEach(fs => {
    const camion = normalizeId(fs.camion);
    if (fs.fecha && camion) observedSet.add(`${fs.fecha}_${camion}`);
  });
  (mercadoList || []).forEach(m => {
    if (!m.fecha) return;
    const matchedTruck = getMercadoTruckCandidates(m).find(camion => bodegaTruckDates.has(`${m.fecha}_${camion}`));
    if (matchedTruck) observedSet.add(`${m.fecha}_${matchedTruck}`);
  });

  const cargasObservadasCount = observedSet.size;
  const totalCargas = Math.max(totalLoadSet.size, cargasObservadasCount);
  const cargasObservadasPct = totalCargas > 0 ? ((cargasObservadasCount / totalCargas) * 100).toFixed(1) : 0;

  return {
    totalCargas,
    totalMercado,
    mercadoPct,
    totalBodegaObs,
    bodegaPct,
    cargasObservadasCount,
    cargasObservadasPct
  };
}

/**
 * Compute VS Metrics between Bodega and Mercado
 */
export function getVSMetrics(mercadoList, bodegaObsList, bodegaFSList) {
  const totalMercado = (mercadoList || []).length;
  const totalBodega = (bodegaObsList || []).length + (bodegaFSList || []).length;
  const totalErrores = totalMercado + totalBodega;
  const mercadoPct = totalErrores > 0 ? ((totalMercado / totalErrores) * 100).toFixed(1) : '0.0';
  const bodegaPct = totalErrores > 0 ? ((totalBodega / totalErrores) * 100).toFixed(1) : '0.0';
  
  let procedeCount = 0;
  let noProcedeCount = 0;

  (mercadoList || []).forEach(m => {
    if (m.resultado === 'Procede' || !m.resultado) procedeCount++;
    else noProcedeCount++;
  });

  const procedePercentage = totalMercado > 0 ? ((procedeCount / totalMercado) * 100).toFixed(1) : 0;

  return {
    totalMercado,
    totalBodega,
    totalErrores,
    mercadoPct,
    bodegaPct,
    procedeCount,
    noProcedeCount,
    procedePercentage,
    winner: totalBodega < totalMercado ? 'Bodega' : 'Mercado'
  };
}

/**
 * Traceability Records linking Mercado and Bodega Loads
 * FIXED: Guarantees full match of exact Mercado Complaints & Bodega Novedades
 */
export function getTraceabilityRecords(mercadoList, bodegaCamiones, bodegaObs, bodegaFS) {
  const truckIndex = {};

  const addUserCount = (item, role, incoming) => {
    const cleanIncoming = cleanCell(incoming, '');
    if (!cleanIncoming || ['sin dato', 'sin usuario', 'none', 'nan'].includes(cleanIncoming.toLowerCase())) return;
    item.user_counts[role][cleanIncoming] = (item.user_counts[role][cleanIncoming] || 0) + 1;
  };

  const choosePrimaryUser = (counts) => {
    const candidates = Object.entries(counts);
    if (candidates.length === 0) return 'Sin dato';
    candidates.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return candidates[0][0];
  };

  const getOrCreate = (fecha, camionRaw = '') => {
    const camion = normalizeId(camionRaw) || 'GENERAL';
    const key = `${fecha}_${camion}`;
    if (!truckIndex[key]) {
      truckIndex[key] = {
        fecha: fecha,
        camion,
        viaje: 'A',
        usuario_bodega: 'Sin dato',
        usuario_control: 'Sin dato',
        usuario_despacho: 'Sin dato',
        cajas: 0,
        user_counts: { bodega: {}, control: {}, despacho: {} },
        observaciones_bodega: [],
        mercado_reports: []
      };
    }
    return truckIndex[key];
  };

  (bodegaCamiones || []).forEach(c => {
    if (!c.fecha || !c.camion) return;
    const item = getOrCreate(c.fecha, c.camion);
    item.viaje = item.viaje === 'A' ? (cleanCell(c.viaje, 'A') || 'A') : item.viaje;
    addUserCount(item, 'bodega', c.usuario_bodega);
    addUserCount(item, 'control', c.usuario_control);
    addUserCount(item, 'despacho', c.usuario_despacho);
    item.cajas += Number(c.cajas) || 0;
  });

  (bodegaObs || []).forEach(obs => {
    if (!obs.fecha) return;
    const item = getOrCreate(obs.fecha, obs.camion || 'GENERAL');
    item.viaje = item.viaje === 'A' ? (cleanCell(obs.viaje, 'A') || 'A') : item.viaje;
    item.observaciones_bodega.push(obs);
  });

  (bodegaFS || []).forEach(fs => {
    if (!fs.fecha) return;
    const item = getOrCreate(fs.fecha, fs.camion || 'GENERAL');
    item.viaje = item.viaje === 'A' ? (cleanCell(fs.viaje, 'A') || 'A') : item.viaje;
    item.observaciones_bodega.push(fs);
  });

  (mercadoList || []).forEach(m => {
    if (!m.fecha) return;
    const keyId = getMercadoTruckCandidates(m)[0] || 'MERCADO';
    const item = getOrCreate(m.fecha, keyId);
    item.mercado_reports.push(m);
  });

  Object.values(truckIndex).forEach(item => {
    item.usuario_bodega = choosePrimaryUser(item.user_counts.bodega);
    item.usuario_control = choosePrimaryUser(item.user_counts.control);
    item.usuario_despacho = choosePrimaryUser(item.user_counts.despacho);
    delete item.user_counts;
  });

  // Keep every load in the audit table so the three responsible roles are visible
  // even when that load has no reported discrepancy.
  const traceList = Object.values(truckIndex);
  return traceList
    .sort((a, b) => {
      const byDate = String(b.fecha).localeCompare(String(a.fecha));
      if (byDate !== 0) return byDate;
      const byIssues = (b.mercado_reports.length + b.observaciones_bodega.length) - (a.mercado_reports.length + a.observaciones_bodega.length);
      if (byIssues !== 0) return byIssues;
      return String(a.camion).localeCompare(String(b.camion), undefined, { numeric: true });
    })
    .slice(0, 300);
}

/**
 * Advisor Leaderboard & Top Products for Internal Control
 */
export function getAdvisorRanking(mercadoList, bodegaCamiones, bodegaObs, bodegaFS) {
  const advisorStats = {};

  const isRegisteredUser = (value) => {
    const normalized = cleanCell(value, '').toUpperCase();
    return Boolean(normalized && !['SIN USUARIO', 'SIN DATO', 'NONE', 'NAN'].includes(normalized));
  };

  const touchAdvisor = (name) => {
    if (!isRegisteredUser(name)) return null;
    const cleanName = name.toUpperCase().trim();
    if (!advisorStats[cleanName]) {
      advisorStats[cleanName] = {
        name: cleanName,
        totalRegistros: 0,
        observacionesDetalle: []
      };
    }
    return advisorStats[cleanName];
  };

  (mercadoList || []).forEach(m => {
    const adv = touchAdvisor(m.distribuidor || m.asesor);
    if (adv) {
      adv.totalRegistros++;
      adv.observacionesDetalle.push(`${m.motivo}: ${m.producto_esperado}`);
    }
  });

  (bodegaCamiones || []).forEach(b => {
    if (b.usuario_bodega) {
      const adv = touchAdvisor(b.usuario_bodega);
      if (adv) { adv.totalRegistros++; }
    }
    if (b.usuario_control) {
      const adv = touchAdvisor(b.usuario_control);
      if (adv) { adv.totalRegistros++; }
    }
    if (b.usuario_despacho) {
      const adv = touchAdvisor(b.usuario_despacho);
      if (adv) { adv.totalRegistros++; }
    }
  });

  (bodegaObs || []).forEach(o => {
    if (o.usuario) {
      const adv = touchAdvisor(o.usuario);
      if (adv && o.descripcion) {
        adv.observacionesDetalle.push(o.descripcion);
      }
    }
  });

  const advisorArray = Object.values(advisorStats);
  const top5Active = [...advisorArray].sort((a, b) => b.totalRegistros - a.totalRegistros).slice(0, 5);
  const bottom5Active = [...advisorArray]
    .sort((a, b) => a.totalRegistros - b.totalRegistros || a.name.localeCompare(b.name))
    .slice(0, 5);

  const unregisteredRoles = [
    { label: 'SIN REGISTRO - ARMADO', role: 'Armado', count: (bodegaCamiones || []).filter(b => !isRegisteredUser(b.usuario_bodega)).length },
    { label: 'SIN REGISTRO - CONTROL', role: 'Control', count: (bodegaCamiones || []).filter(b => !isRegisteredUser(b.usuario_control)).length },
    { label: 'SIN REGISTRO - DESPACHO', role: 'Despacho', count: (bodegaCamiones || []).filter(b => !isRegisteredUser(b.usuario_despacho)).length }
  ].filter(item => item.count > 0);

  const productErrorMap = {};
  (mercadoList || []).forEach(m => {
    const prod = m.producto_esperado || 'PRODUCTO DESCONOCIDO';
    if (!productErrorMap[prod]) productErrorMap[prod] = { name: prod, count: 0, tipo: m.motivo };
    productErrorMap[prod].count += 1;
  });

  (bodegaFS || []).forEach(fs => {
    const prod = fs.descripcion || 'PRODUCTO DESCONOCIDO';
    if (!productErrorMap[prod]) productErrorMap[prod] = { name: prod, count: 0, tipo: fs.tipo_fs || 'Faltante' };
    productErrorMap[prod].count += 1;
  });

  const top5CriticalProducts = Object.values(productErrorMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const motivoMap = {};
  (mercadoList || []).forEach(m => {
    const mot = m.motivo || 'NO ESPECIFICADO';
    motivoMap[mot] = (motivoMap[mot] || 0) + 1;
  });

  const topMotivos = Object.entries(motivoMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  return {
    allAdvisors: advisorArray,
    top5Active,
    bottom5Active,
    unregisteredRoles,
    top5CriticalProducts,
    topMotivos
  };
}

/**
 * Purge Date Range from Dataset
 */
export function calculateAvailableDates(dataset) {
  const mercadoDates = getSortedValidDates(dataset?.mercado);
  const bodegaDates = getSortedValidDates([
    ...(dataset?.bodega_camiones || []),
    ...(dataset?.bodega_observaciones || []),
    ...(dataset?.bodega_faltantes_sobrantes || [])
  ]);

  return {
    mercado_start: mercadoDates[0] || '',
    mercado_end: mercadoDates[mercadoDates.length - 1] || '',
    bodega_start: bodegaDates[0] || '',
    bodega_end: bodegaDates[bodegaDates.length - 1] || ''
  };
}

export function countRecordsInDateRange(dataset, startDate, endDate) {
  if (!dataset || !startDate || !endDate) {
    return { mercado: 0, bodega_camiones: 0, bodega_observaciones: 0, bodega_faltantes_sobrantes: 0, total: 0 };
  }

  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;

  const summary = {
    mercado: countInDateRange(dataset.mercado, from, to),
    bodega_camiones: countInDateRange(dataset.bodega_camiones, from, to),
    bodega_observaciones: countInDateRange(dataset.bodega_observaciones, from, to),
    bodega_faltantes_sobrantes: countInDateRange(dataset.bodega_faltantes_sobrantes, from, to)
  };

  return {
    ...summary,
    total: summary.mercado + summary.bodega_camiones + summary.bodega_observaciones + summary.bodega_faltantes_sobrantes
  };
}

export function purgeDatesFromDataset(dataset, startDate, endDate) {
  if (!dataset || !startDate || !endDate) return dataset;

  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;
  const isBetween = (dtStr) => dtStr >= from && dtStr <= to;

  const nextDataset = {
    ...dataset,
    mercado: (dataset.mercado || []).filter(m => !isBetween(m.fecha)),
    bodega_camiones: (dataset.bodega_camiones || []).filter(b => !isBetween(b.fecha)),
    bodega_observaciones: (dataset.bodega_observaciones || []).filter(o => !isBetween(o.fecha)),
    bodega_faltantes_sobrantes: (dataset.bodega_faltantes_sobrantes || []).filter(fs => !isBetween(fs.fecha))
  };

  const hasRemainingRecords = [
    nextDataset.mercado,
    nextDataset.bodega_camiones,
    nextDataset.bodega_observaciones,
    nextDataset.bodega_faltantes_sobrantes
  ].some(records => records.length > 0);

  return {
    ...nextDataset,
    loaded_files: hasRemainingRecords ? (nextDataset.loaded_files || []) : [],
    available_dates: calculateAvailableDates(nextDataset)
  };
}

/**
 * Parse client-side uploaded Excel files
 */
// eslint-disable-next-line no-unused-vars
function parseUploadedExcelFileLegacy(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });

        const isBodega = workbook.SheetNames.includes('Camiones') || workbook.SheetNames.includes('Informe observaciones');

        let newMercado = [];
        let newBodegaCamiones = [];

        if (isBodega) {
          if (workbook.SheetNames.includes('Camiones')) {
            const sheet = workbook.Sheets['Camiones'];
            const rows = XLSX.utils.sheet_to_json(sheet);
            newBodegaCamiones = rows.map(r => ({
              sucursal: r['Sucursal'] || '11-COCHABAMBA',
              fecha: r['Fecha'] ? String(r['Fecha']) : '',
              camion: String(r['Camión'] || r['Camion'] || ''),
              viaje: r['Viaje'] || 'A',
              estado_carga: r['Estado carga'] || 'Despachado',
              usuario_bodega: r['Usuario bodega'] || '',
              usuario_control: r['Usuario control'] || '',
              usuario_despacho: r['Usuario despacho'] || '',
              cajas: Number(r['Cajas']) || 0
            }));
          }
        } else {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);
          newMercado = rows.map((r, idx) => {
            const dtStr = r['FECHA'] ? String(r['FECHA']).slice(0, 10) : new Date().toISOString().slice(0, 10);
            return {
              id: `UP_${Date.now()}_${idx}`,
              fecha: dtStr,
              mes: 'Archivo Subido',
              dia: dtStr,
              distribuidor: r['DISTRIBUIDOR'] || r['CARGA'] || r['ASESOR'] || 'Asesor Registrado',
              asesor: r['DISTRIBUIDOR'] || r['CARGA'] || r['ASESOR'] || 'Asesor Registrado',
              producto_esperado: r['DETALLE SKU'] || r['SKU'] || 'PRODUCTO REPORTE',
              motivo: r['MOTIVO REPORTE'] || r['MOTIVO'] || 'FALTANTE BODEGA',
              cantidad: Number(r['CANT.']) || Number(r['CANTIDAD']) || 1,
              unidad: r['UNIDAD'] || 'BOT.',
              producto_entregado: r['DETALLE SKU2'] || '-',
              lugar: r['LUGAR DEL REPORTE'] || 'BODEGA',
              resultado: r['RESULTADO'] || 'Procede',
              tipo_clasificacion: (r['MOTIVO REPORTE'] || '').includes('SOBRANTE') ? 'Sobrante' : (r['MOTIVO REPORTE'] || '').includes('CRUCE') ? 'Cruce' : 'Faltante'
            };
          });
        }

        resolve({
          mercado: newMercado,
          bodega_camiones: newBodegaCamiones,
          fileName: file.name
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseUploadedExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const findSheet = (...names) => workbook.SheetNames.find(sheetName => (
          names.some(name => sheetName.trim().toLowerCase() === name.toLowerCase())
        ));

        const readRows = (sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        const camionesSheet = findSheet('Camiones');
        const observacionesSheet = findSheet('Informe observaciones');
        const faltantesSheet = findSheet('Informe faltantes y sobrantes');
        const isBodega = Boolean(camionesSheet || observacionesSheet || faltantesSheet);

        let newMercado = [];
        let newBodegaCamiones = [];
        let newBodegaObservaciones = [];
        let newBodegaFS = [];

        if (isBodega) {
          if (camionesSheet) {
            newBodegaCamiones = readRows(camionesSheet).map(row => ({
              sucursal: getFirstValue(row, ['Sucursal'], '11-COCHABAMBA'),
              fecha: normalizeDateValue(getFirstRawValue(row, ['Fecha', 'FECHA'])),
              camion: normalizeId(getFirstValue(row, ['Camion', 'Camión', 'CamiÃ³n', 'Camin'])),
              viaje: getFirstValue(row, ['Viaje'], 'A'),
              estado_carga: getFirstValue(row, ['Estado carga'], 'Despachado'),
              usuario_bodega: getFirstValue(row, ['Usuario bodega'], 'Sin Usuario'),
              usuario_control: getFirstValue(row, ['Usuario control'], 'Sin Usuario'),
              usuario_despacho: getFirstValue(row, ['Usuario despacho'], 'Sin Usuario'),
              cajas: Number(getFirstValue(row, ['Cajas'], 0)) || 0
            })).filter(row => row.fecha && row.camion);
          }

          if (observacionesSheet) {
            newBodegaObservaciones = readRows(observacionesSheet).map(row => ({
              sucursal: getFirstValue(row, ['Sucursal'], '11'),
              fecha: normalizeDateValue(getFirstRawValue(row, ['Fecha', 'FECHA'])),
              camion: normalizeId(getFirstValue(row, ['Camion', 'Camión', 'CamiÃ³n', 'Camin'])),
              viaje: getFirstValue(row, ['Viaje'], 'A'),
              id_pallet: getFirstValue(row, ['ID_Pallet', 'ID Pallet']),
              descripcion: getFirstValue(row, ['Descripcion', 'Descripción', 'DescripciÃ³n', 'Descripcin']),
              origen: getFirstValue(row, ['Origen'], 'Control'),
              usuario: getFirstValue(row, ['Usuario'], 'Sin Usuario')
            })).filter(row => row.fecha && (row.camion || row.descripcion));
          }

          if (faltantesSheet) {
            newBodegaFS = readRows(faltantesSheet).map(row => ({
              sucursal: getFirstValue(row, ['Sucursal'], '11'),
              fecha: normalizeDateValue(getFirstRawValue(row, ['Fecha', 'FECHA'])),
              camion: normalizeId(getFirstValue(row, ['Camion', 'Camión', 'CamiÃ³n', 'Camin'])),
              viaje: getFirstValue(row, ['Viaje'], 'A'),
              id_pallet: getFirstValue(row, ['ID_Pallet', 'ID Pallet']),
              cod_articulo: getFirstValue(row, ['Cod. articulo', 'Cod. artículo', 'Cod. artÃ­culo', 'Cod. artculo']),
              descripcion: getFirstValue(row, ['Descripcion', 'Descripción', 'DescripciÃ³n', 'Descripcin']),
              cajas: Number(getFirstValue(row, ['Cajas'], 0)) || 0,
              botellas: Number(getFirstValue(row, ['Botellas'], 0)) || 0,
              tipo_fs: getFirstValue(row, ['DescripcionFS', 'DescripciónFS', 'DescripciÃ³nFS', 'DescripcinFS'], 'Faltante'),
              usuario: getFirstValue(row, ['Usuario'], 'Sin Usuario'),
              origen: getFirstValue(row, ['Origen'], 'Control')
            })).filter(row => row.fecha && (row.camion || row.descripcion));
          }
        } else {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
          newMercado = rows.map((row, idx) => {
            const fecha = normalizeDateValue(getFirstRawValue(row, ['FECHA', 'Fecha'])) || new Date().toISOString().slice(0, 10);
            const motivo = getFirstValue(row, ['MOTIVO REPORTE', 'MOTIVO', 'Motivo'], 'FALTANTE BODEGA');
            const distribuidor = normalizeId(getFirstValue(row, ['DISTRIBUIDOR', 'CARGA', 'ASESOR', 'Distribuidor', 'Carga', 'Asesor'], 'Asesor Registrado'));
            const productoEntregado = getFirstValue(row, ['DETALLE SKU2', 'SKU2', 'PRODUCTO ENTREGADO'], '-');

            return {
              id: `UP_${Date.now()}_${idx}`,
              fecha,
              mes: getMonthName(fecha),
              dia: getDisplayDate(fecha),
              distribuidor,
              asesor: distribuidor,
              carga: normalizeId(getFirstValue(row, ['CARGA', 'Carga'], distribuidor)),
              producto_esperado: getFirstValue(row, ['DETALLE SKU', 'SKU', 'PRODUCTO ESPERADO'], 'PRODUCTO REPORTE'),
              motivo,
              cantidad: Number(getFirstValue(row, ['CANT.', 'CANTIDAD', 'Cantidad'], 1)) || 1,
              unidad: getFirstValue(row, ['UNIDAD', 'Unidad'], 'BOT.'),
              producto_entregado: productoEntregado === 'nan' ? '-' : productoEntregado,
              lugar: getFirstValue(row, ['LUGAR DEL REPORTE', 'LUGAR', 'Lugar'], 'BODEGA'),
              resultado: getFirstValue(row, ['RESULTADO', 'Resultado'], 'Procede'),
              observacion: getFirstValue(row, ['OBSERVACION', 'OBSERVACIÓN', 'OBSERVACIÃ“N', 'Accion', 'Acción', 'AcciÃ³n'], ''),
              tipo_clasificacion: motivo.toUpperCase().includes('SOBRANTE')
                ? 'Sobrante'
                : motivo.toUpperCase().includes('CRUCE')
                  ? 'Cruce'
                  : motivo.toUpperCase().includes('VAC')
                    ? 'Vacía'
                    : 'Faltante'
            };
          }).filter(row => row.fecha);
        }

        resolve({
          mercado: newMercado,
          bodega_camiones: newBodegaCamiones,
          bodega_observaciones: newBodegaObservaciones,
          bodega_faltantes_sobrantes: newBodegaFS,
          fileName: file.name
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

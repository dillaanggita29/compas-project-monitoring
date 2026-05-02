import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine, Legend
} from 'recharts';
import { 
  LayoutDashboard, ListTodo, CheckCircle2, CircleDashed, 
  Clock, AlertCircle, ChevronDown, ChevronUp, Calendar, Filter, Loader2, ArrowRightLeft, Target, BarChart2, Info, PauseCircle, Paperclip
} from 'lucide-react';

// --- BRAND COLORS COMPAS.CO.ID ---
const BRAND_PRIMARY = "#257BD3"; 
const BRAND_SECONDARY = "#5299e1"; 

// --- KONFIGURASI WARNA STATUS ---
const STATUS_COLORS = {
  "Complete": { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  "In Progress": { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", icon: <CircleDashed className="w-4 h-4 animate-spin-slow" /> },
  "Hold On": { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: <PauseCircle className="w-4 h-4" /> },
  "Not Started": { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", icon: <Clock className="w-4 h-4" /> },
  "Needs Review": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: <AlertCircle className="w-4 h-4" /> },
};

const getStatusConfig = (statusStr) => {
  const s = (statusStr || '').toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return STATUS_COLORS["Complete"];
  if (s.includes('hold') || s.includes('pending') || s.includes('tunda') || s.includes('cancel')) return STATUS_COLORS["Hold On"];
  if (s.includes('progress') || s.includes('ongoing') || s.includes('berjalan')) return STATUS_COLORS["In Progress"];
  if (s.includes('review') || s.includes('cek')) return STATUS_COLORS["Needs Review"];
  return STATUS_COLORS["Not Started"]; 
};

// --- SMART REMARKS DENGAN IKON PAPERCLIP (TANPA TEKS) ---
const formatRemarks = (text) => {
  if (!text || text === '-') return '-';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(text)) {
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-blue-50 p-1.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors" onClick={(e) => e.stopPropagation()} title={part}>
            <Paperclip className="w-4 h-4 text-[#257BD3]" />
          </a>
        );
      }
      return <span key={i} className="whitespace-normal break-words">{part}</span>;
    });
  }
  return <span className="whitespace-normal break-words">{text}</span>;
};

const parseCustomDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return null;
  const str = dateStr.trim();
  const parts = str.split('-');
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toLowerCase().substring(0, 3);
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const month = months[monthStr];
    if (!isNaN(day) && month !== undefined) {
      const d = new Date();
      d.setFullYear(2026); 
      d.setMonth(month, day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  return null;
};

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && !insideQuotes) {
      insideQuotes = true;
    } else if (char === '"' && insideQuotes) {
      if (nextChar === '"') {
        currentCell += '"'; i++;
      } else {
        insideQuotes = false;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; 
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentRow.length > 0 || currentCell !== '') {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  let headerIdx = -1;
  let colMap = {};

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const rowUpper = rows[i].map(c => (c || '').trim().toUpperCase());
    
    const tIdx = rowUpper.findIndex(c => c.includes('TASK'));
    const iIdx = rowUpper.findIndex(c => c.includes('INITIATIVE') || c.includes('PROJECT'));
    
    if (tIdx !== -1 || iIdx !== -1) {
      headerIdx = i;
      colMap = {
        task: tIdx,
        initiative: iIdx,
        status: rowUpper.findIndex(c => c.includes('STATUS')),
        days: rowUpper.findIndex(c => c === 'DAYS' || c.includes('HARI')),
        division: rowUpper.findIndex(c => c.includes('DIVIS')),
        r: rowUpper.findIndex(c => c === 'RESPONSIBLE' || c === 'R' || c.includes('RESPONSIBLE')), 
        a: rowUpper.findIndex(c => c === 'ACCOUNTABLE' || c === 'A' || c.includes('ACCOUNTABLE')), 
        qa: rowUpper.findIndex(c => c === 'QA' || c.includes('Q/A') || c === 'Q & A'), 
        start: rowUpper.findIndex(c => c.includes('START')), 
        end: rowUpper.findIndex(c => c.includes('END')),     
        adjust: rowUpper.findIndex(c => c === 'ADJUST' || c.includes('ADJUST')), 
        point: rowUpper.findIndex(c => c.includes('POINT')),
        remarks: rowUpper.findIndex(c => c === 'REMARKS' || c.includes('REMARK') || c.includes('LINK') || c.includes('EVIDENCE')), 
        etape: rowUpper.findIndex(c => c === 'ETAPE' || c.includes('ETAPE'))
      };
      break; 
    }
  }

  if (headerIdx === -1) return []; 

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsedData = rows.slice(headerIdx + 1).map((row, index) => {
    if (!row || row.length === 0) return null;
    
    const taskVal = colMap.task !== -1 ? row[colMap.task] : '';
    const initVal = colMap.initiative !== -1 ? row[colMap.initiative] : '';

    if (!taskVal && !initVal) return null;

    const endDateVal = colMap.end !== -1 && row[colMap.end] ? row[colMap.end].trim() : "-";
    const adjustVal = colMap.adjust !== -1 && row[colMap.adjust] ? row[colMap.adjust].trim() : "-";
    const statusVal = colMap.status !== -1 && row[colMap.status] ? row[colMap.status].trim() : "Not Started";
    
    const effectiveEndVal = (adjustVal !== '-' && adjustVal !== '') ? adjustVal : endDateVal;
    const parsedEnd = parseCustomDate(effectiveEndVal);
    let timelineStatus = 'On Track';
    let targetMonth = '-';
    let daysRemaining = null;
    const statusLower = statusVal.toLowerCase();
    
    if (parsedEnd) {
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      targetMonth = monthNames[parsedEnd.getMonth()];
      const diffTime = parsedEnd.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('selesai')) {
      timelineStatus = 'Completed';
    } else if (parsedEnd) {
      if (daysRemaining < 0) timelineStatus = 'Overdue';
      else if (daysRemaining === 0) timelineStatus = 'Due Today';
      else timelineStatus = 'Upcoming';
    } else {
      timelineStatus = 'No Date Set';
    }

    let sheetDays = colMap.days !== -1 ? row[colMap.days] : "0";
    if (sheetDays) sheetDays = sheetDays.trim();

    return {
      id: index + 1,
      task: taskVal ? taskVal.trim() : "Untitled Task",
      initiative: initVal ? initVal.trim() : "Uncategorized",
      status: statusVal,
      division: colMap.division !== -1 && row[colMap.division] ? row[colMap.division].trim() : "-",
      responsible: colMap.r !== -1 && row[colMap.r] ? row[colMap.r].trim() : "Unassigned",
      accountable: colMap.a !== -1 && row[colMap.a] ? row[colMap.a].trim() : "-", 
      qa: colMap.qa !== -1 && row[colMap.qa] ? row[colMap.qa].trim() : "-", 
      days: sheetDays, 
      daysRemaining: daysRemaining,
      points: colMap.point !== -1 ? parseFloat(row[colMap.point]) || 0 : 0,
      startDate: colMap.start !== -1 && row[colMap.start] ? row[colMap.start].trim() : "-",
      endDate: endDateVal,
      targetMonth: targetMonth, 
      timelineStatus: timelineStatus,
      adjust: adjustVal,
      remarks: colMap.remarks !== -1 && row[colMap.remarks] ? row[colMap.remarks].trim() : "-",
      etape: colMap.etape !== -1 && row[colMap.etape] ? row[colMap.etape].trim() : "-"
    };
  });

  return parsedData.filter(item => item !== null);
}

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('monitoring');

  useEffect(() => {
    const fetchGoogleSheetsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSUyXm7vNZVASoAA8-Xbc5Dfkdn75e5UfShXsUuE5Zi_rhZtB4WiiAPWHhwU3S0BINS7Ak3cxqUpXOx/pub?gid=1502631151&single=true&output=csv';
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Gagal mengambil data dari server');
        
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setRawData(parsedData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('Gagal memuat data dari Google Sheets. Pastikan link CSV benar dan bisa diakses publik.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGoogleSheetsData();
  }, []);

  const [filters, setFilters] = useState({
    targetMonth: 'All',
    etape: 'All',
    initiative: 'All',
    status: 'All',
    division: 'All',
    responsible: 'All',
    timeline: 'All'
  });

  const [expandedInitiatives, setExpandedInitiatives] = useState({});

  const toggleInitiative = (initiativeName) => {
    setExpandedInitiatives(prev => ({
      ...prev,
      [initiativeName]: !prev[initiativeName]
    }));
  };

  const processedData = useMemo(() => {
    if (rawData.length === 0) return { filteredTasks: [], initiativeList: [], workloadList: [], metrics: null };

    // Base Filter untuk mengunci nilai Benchmark Total
    const baseFilteredTasks = rawData.filter(task => {
      const matchMonth = filters.targetMonth === 'All' || task.targetMonth === filters.targetMonth;
      const matchEtape = filters.etape === 'All' || task.etape === filters.etape;
      const matchInitiative = filters.initiative === 'All' || task.initiative === filters.initiative;
      const matchDivision = filters.division === 'All' || task.division === filters.division;
      const matchResponsible = filters.responsible === 'All' || task.responsible === filters.responsible;
      return matchMonth && matchEtape && matchInitiative && matchDivision && matchResponsible;
    });

    const filteredTasks = baseFilteredTasks.filter(task => {
      const matchStatus = filters.status === 'All' || task.status === filters.status;
      const matchTimeline = filters.timeline === 'All' || task.timelineStatus === filters.timeline;
      return matchStatus && matchTimeline;
    });

    const totalBaseTasksCount = baseFilteredTasks.length;

    const initiativeMap = {};
    let totalPointsAll = 0;
    
    filteredTasks.forEach(task => {
      totalPointsAll += task.points;
      if (!initiativeMap[task.initiative]) {
        initiativeMap[task.initiative] = {
          name: task.initiative, tasks: [], totalTasks: 0, completedTasks: 0, totalPoints: 0,
          overdueTasksCount: 0 
        };
      }
      initiativeMap[task.initiative].tasks.push(task);
      initiativeMap[task.initiative].totalTasks += 1;
      initiativeMap[task.initiative].totalPoints += task.points;
      
      if (task.timelineStatus === 'Completed') {
        initiativeMap[task.initiative].completedTasks += 1;
      }
      if (task.timelineStatus === 'Overdue') {
        initiativeMap[task.initiative].overdueTasksCount += 1; 
      }
    });

    let initCompleteCount = 0;
    let initOverdueCount = 0;
    let initInProgressCount = 0;

    const initiativeList = Object.values(initiativeMap).map(p => {
      const progress = Math.round((p.completedTasks / p.totalTasks) * 100) || 0;
      if (progress === 100) initCompleteCount++;
      else if (p.overdueTasksCount > 0) initOverdueCount++;
      else initInProgressCount++;

      p.tasks.sort((a, b) => {
        if (a.timelineStatus === 'Completed' && b.timelineStatus !== 'Completed') return 1;
        if (b.timelineStatus === 'Completed' && a.timelineStatus !== 'Completed') return -1;
        const valA = a.daysRemaining !== null ? a.daysRemaining : 9999;
        const valB = b.daysRemaining !== null ? b.daysRemaining : 9999;
        return valA - valB;
      });

      return { ...p, progress };
    }).sort((a, b) => b.progress - a.progress);

    const workloadMap = {};
    filteredTasks.forEach(task => {
      if (!task.responsible || task.responsible === 'Unassigned' || task.responsible === '-') return;
      if (!workloadMap[task.responsible]) {
        workloadMap[task.responsible] = { name: task.responsible, totalTasks: 0, totalPoints: 0 };
      }
      workloadMap[task.responsible].totalTasks += 1;
      workloadMap[task.responsible].totalPoints += task.points;
    });
    const workloadList = Object.values(workloadMap).sort((a, b) => b.totalPoints - a.totalPoints);
    const uniqueResponsiblesCount = workloadList.length;

    // Perhitungan Mutually Exclusive untuk Pipeline (Urutan Logis Standar PM)
    let pipeComplete = 0;
    let pipeInProgress = 0;
    let pipeNotStarted = 0;
    let pipeOverdue = 0;
    let pipeHold = 0;

    baseFilteredTasks.forEach(t => {
      if (t.timelineStatus === 'Completed') {
        pipeComplete++;
      } else {
        const s = t.status.toLowerCase();
        if (s.includes('hold') || s.includes('pending') || s.includes('tunda') || s.includes('cancel')) {
          pipeHold++;
        } else if (t.timelineStatus === 'Overdue') {
          pipeOverdue++;
        } else if (s.includes('progress') || s.includes('ongoing') || s.includes('berjalan') || s.includes('review') || s.includes('cek')) {
          pipeInProgress++;
        } else {
          pipeNotStarted++;
        }
      }
    });

    const completedTasksCount = filteredTasks.filter(t => t.timelineStatus === 'Completed').length;

    const benchmarkPoints = uniqueResponsiblesCount * 56;
    const utilizationRate = benchmarkPoints > 0 ? Math.round((totalPointsAll / benchmarkPoints) * 100) : 0;
    
    let projectHealth = 'On Track';
    let healthColor = 'text-green-600 bg-green-50 border-green-200';
    if (initOverdueCount > (initiativeList.length * 0.2)) {
      projectHealth = 'At Risk';
      healthColor = 'text-red-600 bg-red-50 border-red-200';
    } else if (initOverdueCount > 0) {
      projectHealth = 'Needs Attention';
      healthColor = 'text-amber-600 bg-amber-50 border-amber-200';
    }

    let capacityStatus = 'Optimal';
    let capacityColor = 'text-green-600';
    if (utilizationRate > 100) {
      capacityStatus = 'Overloaded';
      capacityColor = 'text-red-600';
    } else if (utilizationRate < 70) {
      capacityStatus = 'Underutilized';
      capacityColor = 'text-amber-600';
    }

    const metrics = {
      totalInitiatives: initiativeList.length,
      completedInitiatives: initCompleteCount,
      overdueInitiatives: initOverdueCount,
      inProgressInitiatives: initInProgressCount,
      projectHealth,
      healthColor,
      totalTasks: filteredTasks.length,
      totalBaseTasksCount, 
      completedTasks: completedTasksCount,
      pipeComplete,
      pipeInProgress,
      pipeNotStarted,
      pipeOverdue,
      pipeHold,
      totalPoints: totalPointsAll,
      benchmarkPoints,
      utilizationRate,
      capacityStatus,
      capacityColor
    };

    return { filteredTasks, initiativeList, workloadList, metrics };
  }, [rawData, filters]);

  // --- RETROSPECTIVE & COMPARISON DATA PROCESSING ---
  const allEtapes = useMemo(() => {
    return [...new Set(rawData.map(t => t.etape).filter(e => e && e !== '-'))].sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  const [retroFilters, setRetroFilters] = useState({
    pastEtape: '',
    currentEtape: ''
  });

  useEffect(() => {
    if (allEtapes.length >= 2 && !retroFilters.pastEtape) {
      setRetroFilters({
        pastEtape: allEtapes[allEtapes.length - 2],
        currentEtape: allEtapes[allEtapes.length - 1]
      });
    } else if (allEtapes.length === 1 && !retroFilters.pastEtape) {
      setRetroFilters({
        pastEtape: allEtapes[0],
        currentEtape: allEtapes[0]
      });
    }
  }, [allEtapes]);

  const retroData = useMemo(() => {
    if (!retroFilters.pastEtape || !retroFilters.currentEtape) return { pastMetrics: null, currentMetrics: null, carryOverTasks: [], comparisonChartData: [] };

    const pastTasks = rawData.filter(t => t.etape === retroFilters.pastEtape);
    const pastCompletedPoints = pastTasks.filter(t => t.timelineStatus === 'Completed').reduce((acc, curr) => acc + curr.points, 0);
    const pastPendingPoints = pastTasks.filter(t => t.timelineStatus !== 'Completed').reduce((acc, curr) => acc + curr.points, 0);

    const currentTasks = rawData.filter(t => t.etape === retroFilters.currentEtape);
    const currentCompletedPoints = currentTasks.filter(t => t.timelineStatus === 'Completed').reduce((acc, curr) => acc + curr.points, 0);
    const currentPendingPoints = currentTasks.filter(t => t.timelineStatus !== 'Completed').reduce((acc, curr) => acc + curr.points, 0);

    // Cross-reference Tracker
    const carryOverTasks = pastTasks.filter(t => t.timelineStatus !== 'Completed').map(task => {
        const isScheduled = currentTasks.some(ct => ct.task.trim().toLowerCase() === task.task.trim().toLowerCase());
        return { ...task, isScheduled };
    });

    const comparisonChartData = [
      {
        name: retroFilters.pastEtape,
        'Points Selesai': pastCompletedPoints,
        'Points Tertunda': pastPendingPoints,
      },
      {
        name: retroFilters.currentEtape,
        'Points Selesai': currentCompletedPoints,
        'Points Tertunda': currentPendingPoints,
      }
    ];

    return {
      pastMetrics: { etape: retroFilters.pastEtape, completedPoints: pastCompletedPoints, totalTasks: pastTasks.length },
      currentMetrics: { etape: retroFilters.currentEtape, completedPoints: currentCompletedPoints, totalTasks: currentTasks.length },
      carryOverTasks: carryOverTasks,
      comparisonChartData: comparisonChartData
    };
  }, [rawData, retroFilters]);

  const filterOptions = useMemo(() => {
    const rawMonths = [...new Set(rawData.map(t => t.targetMonth).filter(m => m && m !== '-'))];
    const monthOrder = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const sortedMonths = rawMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

    return {
      months: ['All', ...sortedMonths],
      etapes: ['All', ...allEtapes],
      initiatives: ['All', ...new Set(rawData.map(t => t.initiative).filter(i => i && i !== 'Uncategorized'))],
      statuses: ['All', ...new Set(rawData.map(t => t.status).filter(Boolean))],
      divisions: ['All', ...new Set(rawData.map(t => t.division).filter(d => d && d !== '-'))],
      responsibles: ['All', ...new Set(rawData.map(t => t.responsible).filter(r => r && r !== 'Unassigned'))],
      timelines: ['All', 'Completed', 'Upcoming', 'Due Today', 'Overdue', 'No Date Set']
    };
  }, [rawData, allEtapes]);

  const handleFilterChange = (e, filterType) => setFilters(prev => ({ ...prev, [filterType]: e.target.value }));
  const handleRetroFilterChange = (e, filterType) => setRetroFilters(prev => ({ ...prev, [filterType]: e.target.value }));

  const StatusBadge = ({ status }) => {
    const config = getStatusConfig(status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} whitespace-nowrap`}>
        {config.icon}
        {status || "Unknown"}
      </span>
    );
  };

  const TimelineBadge = ({ timeline }) => {
    const isOverdue = timeline === 'Overdue';
    const isToday = timeline === 'Due Today';
    const isCompleted = timeline === 'Completed';
    return (
      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : isToday ? 'bg-orange-100 text-orange-700' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
        {timeline}
      </span>
    );
  }

  const WorkloadTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOverloaded = data.totalPoints > 56;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-600">Beban Kerja: <span className="font-bold" style={{ color: BRAND_PRIMARY }}>{data.totalPoints} Points</span></p>
            <p className="text-slate-600">Batas Aman: <span className="font-bold">56 Points</span></p>
            <p className={`font-bold mt-2 pt-1 border-t border-slate-100 ${isOverloaded ? 'text-red-600' : 'text-green-600'}`}>
              Status: {isOverloaded ? '⚠️ Overloaded' : '✅ Kapasitas Aman'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50" style={{ color: BRAND_PRIMARY }}><Loader2 className="w-12 h-12 animate-spin" /><p className="font-medium">Menarik data dari Google Sheets...</p></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-center bg-slate-50"><AlertCircle className="w-16 h-16 text-red-500" /><h2 className="text-xl font-bold">Terjadi Kesalahan</h2><p>{error}</p><button onClick={() => window.location.reload()} className="px-4 py-2 text-white rounded" style={{ backgroundColor: BRAND_PRIMARY }}>Coba Lagi</button></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 text-slate-900">
              Project Management & Monitoring System
            </h1>
            <p className="text-sm mt-1 font-bold tracking-wider uppercase" style={{ color: BRAND_PRIMARY }}>
              COMPAS.CO.ID
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="flex h-2 w-2 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-green-500"></span></span>
              <span className="font-medium text-slate-700 text-sm">Live Sync</span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 mb-6 space-x-1">
          <button 
            onClick={() => setActiveTab('monitoring')}
            className={`px-5 py-3 font-semibold text-sm transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'monitoring' ? 'border-[#257BD3]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'}`}
            style={{ color: activeTab === 'monitoring' ? BRAND_PRIMARY : undefined }}
          >
            <LayoutDashboard className="w-4 h-4" /> Project Monitoring
          </button>
          <button 
            onClick={() => setActiveTab('retrospective')}
            className={`px-5 py-3 font-semibold text-sm transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'retrospective' ? 'border-[#257BD3]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'}`}
            style={{ color: activeTab === 'retrospective' ? BRAND_PRIMARY : undefined }}
          >
            <ArrowRightLeft className="w-4 h-4" /> Project Comparison
          </button>
        </div>

        {/* =========================================
            TAB 1: PROJECT MONITORING
        ========================================= */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* FILTERS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Target Bulan</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none font-medium text-[#257BD3]" value={filters.targetMonth} onChange={(e) => handleFilterChange(e, 'targetMonth')}>
                    <option value="All">Semua Bulan</option>
                    {filterOptions.months.filter(m => m !== 'All').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Etape</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.etape} onChange={(e) => handleFilterChange(e, 'etape')}>
                    {filterOptions.etapes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Initiative</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.initiative} onChange={(e) => handleFilterChange(e, 'initiative')}>
                    {filterOptions.initiatives.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Timeline Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.timeline} onChange={(e) => handleFilterChange(e, 'timeline')}>
                    {filterOptions.timelines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.status} onChange={(e) => handleFilterChange(e, 'status')}>
                    {filterOptions.statuses.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Divisi</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.division} onChange={(e) => handleFilterChange(e, 'division')}>
                    {filterOptions.divisions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Responsible</label>
                  <select className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none" value={filters.responsible} onChange={(e) => handleFilterChange(e, 'responsible')}>
                    {filterOptions.responsibles.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* DETAILED SUMMARY SCORECARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${BRAND_PRIMARY}1A`, color: BRAND_PRIMARY }}><LayoutDashboard className="w-5 h-5" /></div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Health</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${processedData.metrics?.healthColor}`}>
                      {processedData.metrics?.projectHealth}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{processedData.metrics?.completedInitiatives} <span className="text-lg text-slate-400 font-medium">/ {processedData.metrics?.totalInitiatives}</span></p>
                  <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-tight">
                    Rasio Inisiatif (Project Besar) yang telah rampung 100%. Status "At Risk" membutuhkan eskalasi manajemen.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ListTodo className="w-5 h-5" /></div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Execution</p>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{processedData.metrics?.completedTasks} <span className="text-lg text-slate-400 font-medium">/ {processedData.metrics?.totalBaseTasksCount}</span></p>
                  <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-tight">
                    Rasio penyelesaian seluruh tugas operasional terhadap total benchmark.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><CircleDashed className="w-5 h-5" /></div>
                  <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Status</p></div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">Complete</span>
                    <span className="font-bold text-green-600">{processedData.metrics?.pipeComplete} <span className="text-[10px] text-slate-400 font-normal">/ {processedData.metrics?.totalBaseTasksCount}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">In Progress</span>
                    <span className="font-bold text-yellow-600">{processedData.metrics?.pipeInProgress} <span className="text-[10px] text-slate-400 font-normal">/ {processedData.metrics?.totalBaseTasksCount}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">Not Started</span>
                    <span className="font-bold text-slate-500">{processedData.metrics?.pipeNotStarted} <span className="text-[10px] text-slate-400 font-normal">/ {processedData.metrics?.totalBaseTasksCount}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">Overdue</span>
                    <span className="font-bold text-red-600">{processedData.metrics?.pipeOverdue} <span className="text-[10px] text-slate-400 font-normal">/ {processedData.metrics?.totalBaseTasksCount}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">Hold On</span>
                    <span className="font-bold text-orange-600">{processedData.metrics?.pipeHold} <span className="text-[10px] text-slate-400 font-normal">/ {processedData.metrics?.totalBaseTasksCount}</span></span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full flex overflow-hidden mt-1">
                    <div style={{width: `${(processedData.metrics?.pipeComplete/processedData.metrics?.totalBaseTasksCount)*100}%`}} className="bg-green-500"></div>
                    <div style={{width: `${(processedData.metrics?.pipeInProgress/processedData.metrics?.totalBaseTasksCount)*100}%`}} className="bg-yellow-400"></div>
                    <div style={{width: `${(processedData.metrics?.pipeNotStarted/processedData.metrics?.totalBaseTasksCount)*100}%`}} className="bg-slate-300"></div>
                    <div style={{width: `${(processedData.metrics?.pipeOverdue/processedData.metrics?.totalBaseTasksCount)*100}%`}} className="bg-red-500"></div>
                    <div style={{width: `${(processedData.metrics?.pipeHold/processedData.metrics?.totalBaseTasksCount)*100}%`}} className="bg-orange-400"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resource Capacity</p>
                    <span className={`inline-block mt-1 text-[11px] font-bold ${processedData.metrics?.capacityColor}`}>
                      {processedData.metrics?.capacityStatus} ({processedData.metrics?.utilizationRate}%)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{processedData.metrics?.totalPoints} <span className="text-sm text-slate-400 font-medium">/ {processedData.metrics?.benchmarkPoints} Points</span></p>
                  <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-tight">
                    Rasio akumulasi beban kerja aktual terhadap estimasi kapasitas ideal tim (56 Points/Individu).
                  </div>
                </div>
              </div>

            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 shrink-0">Progress Initiative</h3>
                <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '350px' }}>
                  {processedData.initiativeList.length > 0 ? (
                    <div className="space-y-5">
                      {processedData.initiativeList.map((init, idx) => (
                        <div key={idx} className="group">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-sm font-medium text-slate-700 truncate pr-4" title={init.name}>{init.name}</span>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{init.progress}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${init.progress}%`, backgroundColor: init.progress === 100 ? '#10B981' : init.progress > 0 ? BRAND_SECONDARY : '#CBD5E1' }} 
                              className="h-full transition-all duration-500"
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">Data tidak ditemukan</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Workload Tim</h3>
                    <span className="text-[10px] text-slate-500 font-medium">Berdasarkan Total Poin per Individu</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium border border-slate-200 rounded p-1.5 bg-slate-50">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded" style={{ backgroundColor: BRAND_PRIMARY }}></div>Aman (≤ 56)</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500"></div>Overload ({'>'} 56)</div>
                  </div>
                </div>
                <div className="flex-1 min-h-[350px]">
                  {processedData.workloadList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.workloadList} margin={{ top: 5, right: 30, left: 0, bottom: 120 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{fontSize: 12}} angle={-45} textAnchor="end" interval={0} />
                        <YAxis tick={{fontSize: 12}} />
                        <RechartsTooltip content={<WorkloadTooltip />} cursor={{fill: '#F1F5F9'}} />
                        <ReferenceLine y={56} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Batas 56', fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
                        <Bar dataKey="totalPoints" name="Total Points" radius={[4, 4, 0, 0]} barSize={32}>
                          {processedData.workloadList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.totalPoints > 56 ? '#EF4444' : BRAND_PRIMARY} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">Data tidak ditemukan</div>
                  )}
                </div>
              </div>
            </div>

            {/* TABEL 1: DAFTAR KESELURUHAN TASK */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Daftar Keseluruhan Task</h3>
                  <p className="text-sm text-slate-500 mt-1">Ringkasan seluruh tugas operasional untuk mempermudah pelacakan secara komprehensif.</p>
                </div>
                <div className="bg-blue-50 text-[#257BD3] font-bold px-4 py-2 rounded-lg text-sm border border-blue-100 shrink-0">
                  Total: {processedData.filteredTasks.length} Tasks
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap min-w-[200px]">Initiative</th>
                      <th className="px-6 py-4 min-w-[200px]">Task</th>
                      <th className="px-6 py-4 text-center">Days</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 whitespace-nowrap">Etape</th>
                      <th className="px-6 py-4 whitespace-nowrap">Responsible</th>
                      <th className="px-6 py-4 whitespace-nowrap">Accountable</th>
                      <th className="px-6 py-4 whitespace-nowrap">QA</th>
                      <th className="px-6 py-4">Divisi</th>
                      <th className="px-6 py-4 whitespace-nowrap">Start Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">End Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">Adjust</th>
                      <th className="px-6 py-4 text-center">Points</th>
                      <th className="px-6 py-4 min-w-[200px]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedData.filteredTasks.length > 0 ? processedData.filteredTasks.map((task) => (
                      <tr key={`flat-${task.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{task.initiative}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-normal">
                          <div className="flex flex-col gap-1 items-start">
                            <span>{task.task}</span>
                            <TimelineBadge timeline={task.timelineStatus} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{task.days}</td>
                        <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                        <td className="px-6 py-4 font-medium text-[#257BD3] whitespace-nowrap">{task.etape}</td>
                        <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">{task.responsible}</td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.accountable !== '-' ? task.accountable : '-'}</td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.qa !== '-' ? task.qa : '-'}</td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{task.division}</td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.startDate || '-'}</td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap font-medium">{task.endDate || '-'}</td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.adjust || '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{task.points}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatRemarks(task.remarks)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="14" className="p-12 text-center text-slate-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Tidak ada task yang sesuai dengan kriteria filter saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL 2: EXPANDABLE INITIATIVE -> TASK LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Detail Project</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {processedData.initiativeList.length > 0 ? processedData.initiativeList.map((initiative) => (
                  <div key={initiative.name} className="group">
                    <div 
                      className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4 md:gap-0"
                      onClick={() => toggleInitiative(initiative.name)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-1.5 rounded-lg transition-colors border ${expandedInitiatives[initiative.name] ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200'}`} style={{ backgroundColor: expandedInitiatives[initiative.name] ? BRAND_PRIMARY : undefined }}>
                          {expandedInitiatives[initiative.name] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            {initiative.name} 
                            {initiative.overdueTasksCount > 0 && (
                              <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                                ⚠️ {initiative.overdueTasksCount} Task Overdue
                              </span>
                            )}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="text-slate-500">{initiative.completedTasks} / {initiative.totalTasks} Tasks</span>
                            <span className="hidden md:inline">•</span>
                            <span>{initiative.totalPoints} Points</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end md:self-auto">
                        <div className="hidden md:block w-32 bg-slate-200 rounded-full h-2.5 shadow-inner overflow-hidden">
                          <div className="h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${initiative.progress}%`, backgroundColor: BRAND_PRIMARY }}></div>
                        </div>
                        <span className={`text-sm font-bold w-12 text-right ${initiative.progress === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {initiative.progress}%
                        </span>
                      </div>
                    </div>

                    {expandedInitiatives[initiative.name] && (
                      <div className="px-6 pb-6 pt-2 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                          <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                              <tr>
                                <th className="px-4 py-3 min-w-[200px]">Task</th>
                                <th className="px-4 py-3 text-center">Days</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Etape</th>
                                <th className="px-4 py-3 whitespace-nowrap">Responsible</th>
                                <th className="px-4 py-3 whitespace-nowrap">Accountable</th>
                                <th className="px-4 py-3 whitespace-nowrap">QA</th>
                                <th className="px-4 py-3">Divisi</th>
                                <th className="px-4 py-3 whitespace-nowrap">Start Date</th>
                                <th className="px-4 py-3 whitespace-nowrap">End Date</th>
                                <th className="px-4 py-3 whitespace-nowrap">Adjust</th>
                                <th className="px-4 py-3 text-center">Points</th>
                                <th className="px-4 py-3 min-w-[200px]">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {initiative.tasks.map((task) => (
                                <tr key={`group-${task.id}`} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-normal">
                                    <div className="flex flex-col gap-1 items-start">
                                      <span>{task.task}</span>
                                      <TimelineBadge timeline={task.timelineStatus} />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold text-slate-700">{task.days}</td>
                                  <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                                  <td className="px-4 py-3 font-medium text-[#257BD3] whitespace-nowrap">{task.etape}</td>
                                  <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{task.responsible}</td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{task.accountable !== '-' ? task.accountable : '-'}</td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{task.qa !== '-' ? task.qa : '-'}</td>
                                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{task.division}</td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{task.startDate || '-'}</td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">{task.endDate || '-'}</td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{task.adjust || '-'}</td>
                                  <td className="px-4 py-3 text-center font-bold text-slate-700">{task.points}</td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {formatRemarks(task.remarks)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                    <p>Data tidak ditemukan untuk kombinasi filter tersebut.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 2: PROJECT COMPARISON & EVALUATION
        ========================================= */}
        {activeTab === 'retrospective' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#257BD3]"/> Project Comparison
                </h2>
                <p className="text-sm text-slate-500 mt-1">Bandingkan kecepatan penyelesaian tugas (Velocity) antar periode. Analisis perbandingan antara beban kerja yang berhasil diselesaikan dengan beban kerja yang tertunda.</p>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">Periode Pembanding <Info className="w-3 h-3"/></label>
                  <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none font-medium text-slate-700" value={retroFilters.pastEtape} onChange={(e) => handleRetroFilterChange(e, 'pastEtape')}>
                    {allEtapes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <span className="text-slate-400 font-medium text-xs mt-4">VS</span>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">Periode Analisis <Info className="w-3 h-3"/></label>
                  <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none font-medium text-[#257BD3]" value={retroFilters.currentEtape} onChange={(e) => handleRetroFilterChange(e, 'currentEtape')}>
                    {allEtapes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <div className="mb-4 shrink-0">
                  <h3 className="text-lg font-bold text-slate-800">Grafik Komparasi Produktivitas (Velocity)</h3>
                  <span className="text-[10px] text-slate-500 font-medium">Beban kerja diselesaikan (Points) vs Beban tertunda. Jika beban tertunda menumpuk tinggi, artinya kapasitas tim tersumbat.</span>
                </div>
                <div className="flex-1 min-h-[300px]">
                  {retroData.comparisonChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={retroData.comparisonChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{fontSize: 13, fontWeight: 'bold'}} />
                        <YAxis tick={{fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="Points Selesai" fill={BRAND_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={60} />
                        <Bar dataKey="Points Tertunda" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">Pilih Etape untuk membandingkan data.</div>
                  )}
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-center">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300"></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Produktivitas: {retroData.pastMetrics?.etape || '-'}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black text-slate-700">{retroData.pastMetrics?.completedPoints || 0}</p>
                    <p className="text-sm font-medium text-slate-500 mb-1">Points</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Diselesaikan dari total {retroData.pastMetrics?.totalTasks || 0} Task.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: BRAND_PRIMARY }}></div>
                  <p className="text-xs font-bold text-[#257BD3] uppercase tracking-wider mb-2">Produktivitas: {retroData.currentMetrics?.etape || '-'}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black" style={{ color: BRAND_PRIMARY }}>{retroData.currentMetrics?.completedPoints || 0}</p>
                    <p className="text-sm font-medium text-[#257BD3] mb-1">Points</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Diselesaikan dari total {retroData.currentMetrics?.totalTasks || 0} Task.</p>
                </div>
              </div>

            </div>

            {/* PENDING TASK LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-red-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-red-900 flex items-center gap-2"><Target className="w-5 h-5"/> Pending Task List</h3>
                  <p className="text-sm text-red-700/80 mt-1">Daftar task dari periode pembanding (<span className="font-bold">{retroData.pastMetrics?.etape || '-'}</span>) yang belum berstatus "Complete".</p>
                </div>
                <div className="bg-red-100 text-red-800 font-bold px-4 py-2 rounded-lg shrink-0">
                  Total {retroData.carryOverTasks.length} Tasks
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Inisiatif</th>
                      <th className="px-6 py-4">Task</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Status Lanjutan</th>
                      <th className="px-6 py-4">Etape</th>
                      <th className="px-6 py-4">Responsible</th>
                      <th className="px-6 py-4">Accountable</th>
                      <th className="px-6 py-4 whitespace-nowrap">Start Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">End Date</th>
                      <th className="px-6 py-4 text-center">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retroData.carryOverTasks.length > 0 ? retroData.carryOverTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">{task.initiative}</td>
                        <td className="px-6 py-4 text-slate-800 font-medium min-w-[250px]">{task.task}</td>
                        <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                        <td className="px-6 py-4 text-center">
                          {task.isScheduled ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border border-green-200 flex items-center justify-center gap-1 w-max mx-auto">
                              ✅ Lanjut ke {retroFilters.currentEtape}
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border border-red-200 flex items-center justify-center gap-1 w-max mx-auto">
                              ⚠️ Belum Terjadwal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-[#257BD3] whitespace-nowrap">{task.etape}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{task.responsible}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{task.accountable !== '-' ? task.accountable : '-'}</td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{task.startDate || '-'}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{task.endDate || '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{task.points}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="10" className="p-12 text-center text-emerald-600 font-medium">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Luar biasa! Tidak ada task yang tertunda dari periode pembanding tersebut.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

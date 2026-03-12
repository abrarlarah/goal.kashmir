import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, Clock, UserCog, Plus, Edit3, Trash2, RefreshCw, Shield, Download, Calendar } from 'lucide-react';

const ACTION_BADGES = {
    CREATE: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: Plus },
    UPDATE: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Edit3 },
    DELETE: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: Trash2 },
    ROLE_CHANGE: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: Shield },
};

const getActionStyle = (action) => {
    if (action?.startsWith('CREATE')) return ACTION_BADGES.CREATE;
    if (action?.startsWith('UPDATE')) return ACTION_BADGES.UPDATE;
    if (action?.startsWith('DELETE') || action?.startsWith('REMOVE')) return ACTION_BADGES.DELETE;
    if (action?.includes('ROLE')) return ACTION_BADGES.ROLE_CHANGE;
    return ACTION_BADGES.UPDATE;
};

const ENTITY_COLORS = {
    player: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    team: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    tournament: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    user: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    match: 'bg-green-500/10 text-green-400 border-green-500/20',
    lineup: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    news: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    sponsor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

const ITEMS_PER_PAGE = 25;

const AuditLogs = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [entityFilter, setEntityFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [exportDateFrom, setExportDateFrom] = useState('');
    const [exportDateTo, setExportDateTo] = useState('');

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/admin');
            return;
        }
    }, [isSuperAdmin, navigate]);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Convert Firestore Timestamp to JS Date for display
                    timestamp: doc.data().timestamp?.toDate?.() || null,
                }));
                setLogs(data);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || null,
            }));
            setLogs(data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter logs
    const filteredLogs = useMemo(() => {
        const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;

        return logs.filter(log => {
            const matchesSearch = searchTerm === '' ||
                (log.adminEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.entityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;

            const matchesAction = actionFilter === 'all' ||
                (actionFilter === 'create' && log.action?.startsWith('CREATE')) ||
                (actionFilter === 'update' && (log.action?.startsWith('UPDATE') || log.action?.includes('ROLE'))) ||
                (actionFilter === 'delete' && (log.action?.startsWith('DELETE') || log.action?.startsWith('REMOVE')));

            const matchesDateFrom = !fromDate || (log.timestamp && log.timestamp >= fromDate);
            const matchesDateTo = !toDate || (log.timestamp && log.timestamp <= toDate);

            return matchesSearch && matchesEntity && matchesAction && matchesDateFrom && matchesDateTo;
        });
    }, [logs, searchTerm, entityFilter, actionFilter, dateFrom, dateTo]);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, entityFilter, actionFilter, dateFrom, dateTo]);

    // Export to CSV
    const handleExportCSV = () => {
        const expFrom = exportDateFrom ? new Date(exportDateFrom + 'T00:00:00') : null;
        const expTo = exportDateTo ? new Date(exportDateTo + 'T23:59:59') : null;

        // Use filteredLogs as base, then apply export date range on top
        let exportLogs = filteredLogs;
        if (expFrom || expTo) {
            exportLogs = filteredLogs.filter(log => {
                const matchFrom = !expFrom || (log.timestamp && log.timestamp >= expFrom);
                const matchTo = !expTo || (log.timestamp && log.timestamp <= expTo);
                return matchFrom && matchTo;
            });
        }

        if (exportLogs.length === 0) {
            alert('No logs to export for the selected range.');
            return;
        }

        const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Admin Email', 'Admin UID', 'Details'];
        const rows = exportLogs.map(log => [
            log.timestamp ? log.timestamp.toISOString() : '',
            log.action || '',
            log.entityType || '',
            log.entityId || '',
            `"${(log.entityName || '').replace(/"/g, '""')}"`,
            log.adminEmail || '',
            log.adminUid || '',
            log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '',
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `audit_logs_${dateStr}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        setShowExportPanel(false);
    };

    const formatTimestamp = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const formatRelativeTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return '';
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Audit Logs...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <ScrollText size={20} className="text-white" />
                        </div>
                        Audit Logs
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Track all admin actions across the platform • {filteredLogs.length} entries
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowExportPanel(!showExportPanel)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition-all border border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Actions', value: logs.length, color: 'from-brand-500/10 to-brand-600/5 border-brand-500/10 text-brand-400' },
                    { label: 'Creates', value: logs.filter(l => l.action?.startsWith('CREATE')).length, color: 'from-green-500/10 to-green-600/5 border-green-500/10 text-green-400' },
                    { label: 'Updates', value: logs.filter(l => l.action?.startsWith('UPDATE') || l.action?.includes('ROLE')).length, color: 'from-blue-500/10 to-blue-600/5 border-blue-500/10 text-blue-400' },
                    { label: 'Deletes', value: logs.filter(l => l.action?.startsWith('DELETE') || l.action?.startsWith('REMOVE')).length, color: 'from-red-500/10 to-red-600/5 border-red-500/10 text-red-400' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-4 text-center`}>
                        <div className={`text-2xl font-display font-bold text-slate-900 dark:text-white`}>{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Export Panel */}
            {showExportPanel && (
                <div className="bg-slate-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Download size={16} className="text-brand-400" />
                            Export Audit Logs as CSV
                        </h3>
                        <button onClick={() => setShowExportPanel(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs">✕</button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Optionally select a date range for the export. Leaving blank exports all currently filtered logs.</p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">From Date</label>
                            <input
                                type="date"
                                value={exportDateFrom}
                                onChange={(e) => setExportDateFrom(e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">To Date</label>
                            <input
                                type="date"
                                value={exportDateTo}
                                onChange={(e) => setExportDateTo(e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-500/20 whitespace-nowrap"
                        >
                            <Download size={16} /> Download CSV
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by admin email, entity name, or action..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="Filter from date"
                        className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="Filter to date"
                        className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    />
                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    >
                        <option value="all">All Entities</option>
                        <option value="player">Players</option>
                        <option value="team">Teams</option>
                        <option value="tournament">Tournaments</option>
                        <option value="match">Matches</option>
                        <option value="lineup">Lineups</option>
                        <option value="news">News</option>
                        <option value="sponsor">Sponsors</option>
                        <option value="user">Users</option>
                    </select>
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    >
                        <option value="all">All Actions</option>
                        <option value="create">Creates</option>
                        <option value="update">Updates</option>
                        <option value="delete">Deletes</option>
                    </select>
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                        >
                            Clear Dates
                        </button>
                    )}
                </div>
            </div>

            {/* Log Entries */}
            <div className="space-y-2">
                {paginatedLogs.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl bg-slate-50/50 dark:bg-gray-800/30 border border-slate-200/5 dark:border-white/5">
                        <ScrollText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <p className="text-slate-500 font-medium">No audit logs found</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                            {logs.length > 0 ? 'Try adjusting your filters' : 'Actions will appear here once admins make changes'}
                        </p>
                    </div>
                ) : (
                    paginatedLogs.map((log) => {
                        const actionStyle = getActionStyle(log.action);
                        const ActionIcon = actionStyle.icon;
                        const entityColor = ENTITY_COLORS[log.entityType] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                        const relTime = formatRelativeTime(log.timestamp);

                        return (
                            <div
                                key={log.id}
                                className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-gray-800/50 border border-slate-200/10 dark:border-white/5 hover:border-slate-300/30 dark:hover:border-white/10 transition-all"
                            >
                                {/* Action Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${actionStyle.bg} border ${actionStyle.border}`}>
                                    <ActionIcon size={18} className={actionStyle.text} />
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {/* Action Badge */}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}>
                                            {log.action}
                                        </span>
                                        {/* Entity Type Badge */}
                                        {log.entityType && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${entityColor}`}>
                                                {log.entityType}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                                        {log.entityName || <span className="text-slate-400 italic">Unnamed entity</span>}
                                        {log.details?.oldRole && log.details?.newRole && (
                                            <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                                                — {log.details.oldRole || 'User'} → {log.details.newRole || 'User'}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Admin & Time */}
                                <div className="flex flex-col items-start md:items-end flex-shrink-0 gap-0.5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                        <UserCog size={12} />
                                        <span className="truncate max-w-[180px]">{log.adminEmail || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-500">
                                        <Clock size={11} />
                                        <span>{formatTimestamp(log.timestamp)}</span>
                                        {relTime && (
                                            <span className="text-brand-400 font-bold">• {relTime}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5">
                    <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-white font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                        <span className="text-slate-900 dark:text-white font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)}</span> of{' '}
                        <span className="text-slate-900 dark:text-white font-bold">{filteredLogs.length}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-900 dark:text-white px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;

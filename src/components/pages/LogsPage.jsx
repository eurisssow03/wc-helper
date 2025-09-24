import React, { useState, useEffect, useMemo } from 'react';
import { readLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime } from '../../utils/helpers.js';
import { baseStyles, breakpoints } from '../../utils/styles.js';

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    channel: 'all',
    dateRange: 'all',
    confidence: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAIProcessing, setShowAIProcessing] = useState(false);

  // Load logs on component mount
  useEffect(() => {
    const allLogs = readLS(STORAGE_KEYS.logs, []);
    setLogs(allLogs);
  }, []);

  // Filter and sort logs
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.incoming_text?.toLowerCase().includes(searchLower) ||
        log.answer?.toLowerCase().includes(searchLower) ||
        log.matched_question?.toLowerCase().includes(searchLower) ||
        log.channel?.toLowerCase().includes(searchLower)
      );
    }

    // Channel filter
    if (filters.channel !== 'all') {
      filtered = filtered.filter(log => log.channel === filters.channel);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(log => new Date(log.created_at) >= today);
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(log => new Date(log.created_at) >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(log => new Date(log.created_at) >= monthAgo);
          break;
      }
    }

    // Confidence filter
    if (filters.confidence !== 'all') {
      const threshold = parseFloat(filters.confidence);
      filtered = filtered.filter(log => {
        const conf = log.confidence || 0;
        return conf >= threshold;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[filters.sortBy];
      let bVal = b[filters.sortBy];
      
      if (filters.sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, filters]);

  // Get unique channels for filter dropdown
  const channels = useMemo(() => {
    const uniqueChannels = [...new Set(logs.map(log => log.channel))];
    return uniqueChannels.sort();
  }, [logs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      channel: 'all',
      dateRange: 'all',
      confidence: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['时间', '渠道', '用户问题', '匹配问题', '置信度', '回答', '处理时间(ms)'],
      ...filteredLogs.map(log => [
        formatDateTime(log.created_at),
        log.channel || '',
        log.incoming_text || '',
        log.matched_question || '',
        log.confidence ? (log.confidence * 100).toFixed(1) + '%' : '',
        log.answer || '',
        log.processing_time || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceColor = (confidence) => {
    if (!confidence) return '#6c757d';
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  const getConfidenceLabel = (confidence) => {
    if (!confidence) return '—';
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.6) return '中';
    return '低';
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        padding: '16px 20px',
        backgroundColor: 'white',
        borderRadius: 12,
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>System Logs</h2>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {filteredLogs.length} records • Total {logs.length} logs
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={exportLogs}
            style={baseStyles.btnGhost}
            disabled={filteredLogs.length === 0}
          >
            Export CSV
          </button>
          <button
            onClick={() => setLogs(readLS(STORAGE_KEYS.logs, []))}
            style={baseStyles.btnPrimary}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={baseStyles.card}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 16,
          [`@media (max-width: ${breakpoints.mobile})`]: {
            gridTemplateColumns: '1fr',
            gap: 12
          }
        }}>
          <div>
            <label style={baseStyles.label}>Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search questions, answers or channels..."
              style={baseStyles.input}
            />
          </div>
          
          <div>
            <label style={baseStyles.label}>Channel</label>
            <select
              value={filters.channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              style={baseStyles.select}
            >
              <option value="all">All Channels</option>
              {channels.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={baseStyles.label}>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              style={baseStyles.select}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label style={baseStyles.label}>Confidence</label>
            <select
              value={filters.confidence}
              onChange={(e) => handleFilterChange('confidence', e.target.value)}
              style={baseStyles.select}
            >
              <option value="all">All</option>
              <option value="0.8">High (≥80%)</option>
              <option value="0.6">Medium (≥60%)</option>
              <option value="0.4">Low (≥40%)</option>
              <option value="0">No Limit</option>
            </select>
          </div>

          <div>
            <label style={baseStyles.label}>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              style={baseStyles.select}
            >
              <option value="created_at">Time</option>
              <option value="confidence">Confidence</option>
              <option value="channel">Channel</option>
              <option value="processing_time">Processing Time</option>
            </select>
          </div>

          <div>
            <label style={baseStyles.label}>Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              style={baseStyles.select}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={clearFilters}
            style={{
              ...baseStyles.btnGhost,
              fontSize: 12,
              padding: '6px 12px'
            }}
          >
            Clear Filters
          </button>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} records
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={baseStyles.card}>
        {paginatedLogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6c757d'
          }}>
            {filteredLogs.length === 0 ? 'No matching log records found' : 'No log data available'}
          </div>
        ) : (
          <>
            <table style={baseStyles.table}>
              <thead>
                <tr>
              <th style={baseStyles.th}>Time</th>
              <th style={baseStyles.th}>Channel</th>
              <th style={baseStyles.th}>User Question</th>
              <th style={baseStyles.th}>Matched Question</th>
              <th style={baseStyles.th}>Confidence</th>
              <th style={baseStyles.th}>Processing Time</th>
              <th style={baseStyles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, index) => (
                  <tr key={log.id || index} style={{ cursor: 'pointer' }}>
                    <td style={baseStyles.td}>{formatDateTime(log.created_at)}</td>
                    <td style={baseStyles.td}>
                      <span style={baseStyles.badge}>{log.channel || '—'}</span>
                    </td>
                    <td style={{ ...baseStyles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.incoming_text || '—'}
                    </td>
                    <td style={{ ...baseStyles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.matched_question || '—'}
                    </td>
                    <td style={baseStyles.td}>
                      <span style={{
                        ...baseStyles.badge,
                        backgroundColor: getConfidenceColor(log.confidence),
                        color: 'white'
                      }}>
                        {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : '—'}
                      </span>
                      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                        {log.ai_processing?.confidence_category || getConfidenceLabel(log.confidence)}
                      </div>
                    </td>
                    <td style={baseStyles.td}>
                      {log.processing_time ? `${log.processing_time}ms` : '—'}
                    </td>
                    <td style={baseStyles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            ...baseStyles.btnGhost,
                            fontSize: 12,
                            padding: '4px 8px'
                          }}
                        >
                          View Details
                        </button>
                        {log.ai_processing && (
                          <span style={{
                            ...baseStyles.badge,
                            backgroundColor: '#007bff',
                            color: 'white',
                            fontSize: 10,
                            padding: '2px 6px'
                          }}>
                            AI Details
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginTop: 20,
                padding: '16px 0'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...baseStyles.btnGhost,
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          ...baseStyles.btnGhost,
                          backgroundColor: currentPage === pageNum ? '#0ea5e9' : 'transparent',
                          color: currentPage === pageNum ? 'white' : '#0ea5e9',
                          padding: '6px 12px',
                          fontSize: 12
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...baseStyles.btnGhost,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            margin: 20
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ ...baseStyles.label, marginBottom: 4 }}>Time</label>
                <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                  {formatDateTime(selectedLog.created_at)}
                </div>
              </div>

              <div>
                <label style={{ ...baseStyles.label, marginBottom: 4 }}>Channel</label>
                <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                  <span style={baseStyles.badge}>{selectedLog.channel || '—'}</span>
                </div>
              </div>

              <div>
                <label style={{ ...baseStyles.label, marginBottom: 4 }}>User Question</label>
                <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                  {selectedLog.incoming_text || '—'}
                </div>
              </div>

              <div>
                <label style={{ ...baseStyles.label, marginBottom: 4 }}>Matched Question</label>
                <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                  {selectedLog.matched_question || '—'}
                </div>
              </div>

              <div>
                <label style={{ ...baseStyles.label, marginBottom: 4 }}>System Answer</label>
                <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                  {selectedLog.answer || '—'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ ...baseStyles.label, marginBottom: 4 }}>Confidence</label>
                  <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                    <span style={{
                      ...baseStyles.badge,
                      backgroundColor: getConfidenceColor(selectedLog.confidence),
                      color: 'white'
                    }}>
                      {selectedLog.confidence ? `${(selectedLog.confidence * 100).toFixed(1)}%` : '—'}
                    </span>
                    <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                      {getConfidenceLabel(selectedLog.confidence)}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ ...baseStyles.label, marginBottom: 4 }}>Processing Time</label>
                  <div style={{ padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                    {selectedLog.processing_time ? `${selectedLog.processing_time}ms` : '—'}
                  </div>
                </div>
              </div>

              {/* AI Processing Details */}
              {selectedLog.ai_processing && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 16 
                  }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>AI Processing Details</h3>
                    <button
                      onClick={() => setShowAIProcessing(!showAIProcessing)}
                      style={{
                        ...baseStyles.btnGhost,
                        fontSize: 12,
                        padding: '6px 12px'
                      }}
                    >
                      {showAIProcessing ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {showAIProcessing && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: 16,
                      marginBottom: 16
                    }}>
                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Total FAQs</label>
                        <div style={{ padding: 8, backgroundColor: '#e3f2fd', borderRadius: 6 }}>
                          {selectedLog.ai_processing.total_faqs}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Active FAQs</label>
                        <div style={{ padding: 8, backgroundColor: '#e8f5e8', borderRadius: 6 }}>
                          {selectedLog.ai_processing.active_faqs}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Candidates Found</label>
                        <div style={{ padding: 8, backgroundColor: '#fff3e0', borderRadius: 6 }}>
                          {selectedLog.ai_processing.candidates_found}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Confidence Threshold</label>
                        <div style={{ padding: 8, backgroundColor: '#f3e5f5', borderRadius: 6 }}>
                          {(selectedLog.ai_processing.confidence_threshold * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Similarity Threshold</label>
                        <div style={{ padding: 8, backgroundColor: '#fff3e0', borderRadius: 6 }}>
                          {(selectedLog.ai_processing.similarity_threshold * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Search Method</label>
                        <div style={{ padding: 8, backgroundColor: '#e8f5e8', borderRadius: 6 }}>
                          {selectedLog.ai_processing.search_method || 'Unknown'}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Confidence Category</label>
                        <div style={{ 
                          padding: 8, 
                          backgroundColor: selectedLog.ai_processing.confidence_category === 'High' ? '#e8f5e8' : 
                                         selectedLog.ai_processing.confidence_category === 'Medium' ? '#fff3e0' : '#ffebee',
                          borderRadius: 6,
                          fontWeight: 600,
                          color: selectedLog.ai_processing.confidence_category === 'High' ? '#2e7d32' :
                                 selectedLog.ai_processing.confidence_category === 'Medium' ? '#f57c00' : '#d32f2f'
                        }}>
                          {selectedLog.ai_processing.confidence_category || 'Unknown'}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Reranking Applied</label>
                        <div style={{ padding: 8, backgroundColor: '#e3f2fd', borderRadius: 6 }}>
                          {selectedLog.ai_processing.reranking_applied ? 'Yes' : 'No'}
                        </div>
                      </div>

                      <div>
                        <label style={{ ...baseStyles.label, marginBottom: 4 }}>Final Decision</label>
                        <div style={{ padding: 8, backgroundColor: '#e0f2f1', borderRadius: 6 }}>
                          {selectedLog.ai_processing.final_decision}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Candidates */}
                  {showAIProcessing && selectedLog.ai_processing.top_candidates && selectedLog.ai_processing.top_candidates.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ ...baseStyles.label, marginBottom: 8 }}>Top Candidates</label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedLog.ai_processing.top_candidates.map((candidate, index) => (
                          <div key={index} style={{
                            padding: 12,
                            backgroundColor: index === 0 ? '#e8f5e8' : '#f8f9fa',
                            borderRadius: 6,
                            marginBottom: 8,
                            border: index === 0 ? '2px solid #4caf50' : '1px solid #e9ecef'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              #{index + 1} {candidate.question}
                            </div>
                            <div style={{ fontSize: 12, color: '#6c757d', display: 'flex', gap: 16 }}>
                              <span>Similarity: {(candidate.similarity * 100).toFixed(1)}%</span>
                              <span>Final Score: {(candidate.finalScore * 100).toFixed(1)}%</span>
                              <span>Active: {candidate.isActive ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processing Steps */}
                  {showAIProcessing && selectedLog.ai_processing.processing_steps && selectedLog.ai_processing.processing_steps.length > 0 && (
                    <div>
                      <label style={{ ...baseStyles.label, marginBottom: 8 }}>Processing Steps</label>
                      <div style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                        {selectedLog.ai_processing.processing_steps.map((step, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: index < selectedLog.ai_processing.processing_steps.length - 1 ? 8 : 0
                          }}>
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: '#007bff',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              marginRight: 12,
                              flexShrink: 0
                            }}>
                              {index + 1}
                            </div>
                            <span style={{ fontSize: 14 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

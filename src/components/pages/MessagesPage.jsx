import React, { useState, useEffect } from 'react';
import { baseStyles } from '../../utils/styles.js';
import { formatDateTime } from '../../utils/helpers.js';

export function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, processed, error
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch messages from API
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/messages?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError('Failed to fetch messages');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/messages/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMessages();
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMessages();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter messages based on filter and search
  const filteredMessages = messages.filter(message => {
    const matchesFilter = filter === 'all' || message.status === filter;
    const matchesSearch = searchTerm === '' || 
      message.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from?.includes(searchTerm) ||
      message.aiResponse?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.5) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.2rem', color: '#6c757d' }}>Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: '#dc3545', fontSize: '1.2rem' }}>Error: {error}</div>
        <button 
          onClick={fetchMessages}
          style={{ ...baseStyles.btnPrimary, marginTop: '1rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with stats */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600 }}>WhatsApp Messages</h2>
          <button 
            onClick={fetchMessages}
            style={{ ...baseStyles.btnGhost, fontSize: '0.9rem' }}
          >
            🔄 Refresh
          </button>
        </div>
        
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Total Messages</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.total}</div>
            </div>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Processed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#28a745' }}>{stats.processed}</div>
            </div>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Errors</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc3545' }}>{stats.errors}</div>
            </div>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Today</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.today}</div>
            </div>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Unique Customers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.uniqueCustomers}</div>
            </div>
            <div style={baseStyles.card}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Avg Confidence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: getConfidenceColor(stats.averageConfidence) }}>
                {(stats.averageConfidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...baseStyles.btnGhost,
              backgroundColor: filter === 'all' ? '#007bff' : 'transparent',
              color: filter === 'all' ? 'white' : '#007bff'
            }}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('processed')}
            style={{
              ...baseStyles.btnGhost,
              backgroundColor: filter === 'processed' ? '#28a745' : 'transparent',
              color: filter === 'processed' ? 'white' : '#28a745'
            }}
          >
            Processed ({messages.filter(m => m.status === 'processed').length})
          </button>
          <button
            onClick={() => setFilter('error')}
            style={{
              ...baseStyles.btnGhost,
              backgroundColor: filter === 'error' ? '#dc3545' : 'transparent',
              color: filter === 'error' ? 'white' : '#dc3545'
            }}
          >
            Errors ({messages.filter(m => m.status === 'error').length})
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Search messages, phone numbers, or responses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            minWidth: '300px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* Messages List */}
      <div style={baseStyles.card}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
            {messages.length === 0 ? 'No messages received yet' : 'No messages match your filters'}
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredMessages.map((message, index) => (
              <div
                key={message.id || index}
                style={{
                  borderBottom: '1px solid #e9ecef',
                  padding: '1rem',
                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#495057' }}>+{message.from}</span>
                    <span
                      style={{
                        ...baseStyles.badge,
                        backgroundColor: getStatusColor(message.status),
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                    >
                      {message.status}
                    </span>
                    {message.confidence > 0 && (
                      <span
                        style={{
                          ...baseStyles.badge,
                          backgroundColor: getConfidenceColor(message.confidence),
                          color: 'white',
                          fontSize: '0.8rem'
                        }}
                      >
                        {(message.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    {formatDateTime(message.receivedAt)}
                  </div>
                </div>
                
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#495057' }}>Customer Message:</div>
                  <div style={{ padding: '0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px', marginBottom: '0.5rem' }}>
                    {message.text || 'No text content'}
                  </div>
                </div>
                
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#495057' }}>AI Response:</div>
                  <div style={{ padding: '0.5rem', backgroundColor: '#d4edda', borderRadius: '4px', marginBottom: '0.5rem' }}>
                    {message.aiResponse || 'No response generated'}
                  </div>
                </div>
                
                {message.matchedQuestion && (
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', fontStyle: 'italic' }}>
                    Matched: {message.matchedQuestion}
                  </div>
                )}
                
                {message.processingTime > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    Processing time: {message.processingTime}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

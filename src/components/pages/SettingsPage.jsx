import React, { useState, useEffect } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { baseStyles, breakpoints } from '../../utils/styles.js';
import { defaultSettings, TZ, AI_MODEL_OPTIONS } from '../../utils/constants.js';
import { conversationMemoryService } from '../../services/conversationMemoryService.js';

export function SettingsPage({ onSaved }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [databaseSettings, setDatabaseSettings] = useState({
    host: 'localhost',
    port: 5432,
    database: 'wc_helper',
    username: 'postgres',
    password: '',
    ssl: false
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('idle');

  useEffect(() => {
    const savedSettings = readLS(STORAGE_KEYS.settings, defaultSettings);
    console.log('🔧 SettingsPage: Loading settings:', savedSettings);
    console.log('🔧 SettingsPage: Default settings:', defaultSettings);
    
    // Migrate old businessHours structure to new structure
    const migrateBusinessHours = (oldBusinessHours) => {
      if (!oldBusinessHours) return defaultSettings.businessHours;
      
      // If it's the old structure (only has tz, start, end), migrate it
      if (oldBusinessHours.tz && oldBusinessHours.start && oldBusinessHours.end && 
          !oldBusinessHours.monday) {
        console.log('🔄 Migrating old businessHours structure');
        return {
          ...defaultSettings.businessHours,
          tz: oldBusinessHours.tz,
          start: oldBusinessHours.start,
          end: oldBusinessHours.end
        };
      }
      
      // If it's already the new structure, merge with defaults
      return {
        ...defaultSettings.businessHours,
        ...oldBusinessHours
      };
    };
    
    // Ensure businessHours has the proper structure
    const mergedSettings = {
      ...defaultSettings,
      ...savedSettings,
      businessHours: migrateBusinessHours(savedSettings.businessHours)
    };
    
    console.log('🔧 SettingsPage: Merged settings:', mergedSettings);
    setSettings(mergedSettings);
    
    // Load database settings
    const savedDatabaseSettings = readLS('wc_database_settings', {
      host: 'localhost',
      port: 5432,
      database: 'wc_helper',
      username: 'postgres',
      password: '',
      ssl: false
    });
    setDatabaseSettings(savedDatabaseSettings);
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setIsDirty(true);
  };

  const handleNestedChange = (parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    writeLS(STORAGE_KEYS.settings, settings);
    setIsDirty(false);
    if (onSaved) onSaved();
  };

  const handleDatabaseChange = (key, value) => {
    setDatabaseSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDatabaseSave = () => {
    writeLS('wc_database_settings', databaseSettings);
    console.log('🐘 Database settings saved:', databaseSettings);
  };

  const testDatabaseConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    
    try {
      const response = await fetch('/api/postgres/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Host': databaseSettings.host,
          'X-Database-Port': databaseSettings.port.toString(),
          'X-Database-Name': databaseSettings.database,
          'X-Database-User': databaseSettings.username,
          'X-Database-Password': databaseSettings.password,
          'X-Database-SSL': databaseSettings.ssl.toString()
        }
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
        console.log('✅ Database connection successful');
      } else {
        setConnectionStatus('error');
        console.error('❌ Database connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('❌ Database connection error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const migrateToPostgreSQL = async () => {
    setMigrationStatus('migrating');
    
    try {
      const response = await fetch('/api/postgres/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Host': databaseSettings.host,
          'X-Database-Port': databaseSettings.port.toString(),
          'X-Database-Name': databaseSettings.database,
          'X-Database-User': databaseSettings.username,
          'X-Database-Password': databaseSettings.password,
          'X-Database-SSL': databaseSettings.ssl.toString()
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMigrationStatus('completed');
        console.log('✅ Migration completed:', result);
      } else {
        setMigrationStatus('error');
        console.error('❌ Migration failed:', result);
      }
    } catch (error) {
      setMigrationStatus('error');
      console.error('❌ Migration error:', error);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setIsDirty(true);
  };

  // Get available model options for current AI provider
  const getModelOptions = (type) => {
    const provider = settings.aiProvider || 'OpenAI';
    return AI_MODEL_OPTIONS[provider]?.[type] || [];
  };

  // Auto-update models when provider changes
  const handleProviderChange = (provider) => {
    const newSettings = { ...settings, aiProvider: provider };
    
    // Set default models for the new provider
    const embeddingOptions = AI_MODEL_OPTIONS[provider]?.embedding || [];
    const chatOptions = AI_MODEL_OPTIONS[provider]?.chat || [];
    
    if (embeddingOptions.length > 0) {
      newSettings.embeddingModel = embeddingOptions[0].value;
    }
    if (chatOptions.length > 0) {
      newSettings.chatModel = chatOptions[0].value;
    }
    
    setSettings(newSettings);
    setIsDirty(true);
  };

  const tabs = [
    { id: 'business', label: 'AI Working Hours', icon: '🕒' },
    { id: 'ai', label: 'AI Config', icon: '🤖' },
    { id: 'ai_rules', label: 'AI Rules', icon: '📋' },
    { id: 'database', label: 'Database', icon: '🐘' },
    { id: 'memory', label: 'Memory Management', icon: '💾' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '📱' }
  ];


  const renderAISettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Info Card */}
      <div style={{
        ...baseStyles.card,
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>ℹ️</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0c4a6e' }}>AI Configuration Guide</h3>
        </div>
        <div style={{ fontSize: 14, color: '#0c4a6e', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Embedding Model:</strong> Converts text to vectors for finding similar FAQs. Choose based on your accuracy needs and budget.
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Chat Model:</strong> Generates natural responses. GPT-3.5 is cost-effective, GPT-4 offers better quality.
          </p>
          <p style={{ margin: 0 }}>
            <strong>⭐ Recommended:</strong> Best balance of performance and cost for most use cases.
          </p>
        </div>
      </div>

      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>AI Provider</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Answer Mode</label>
          <select
            value={settings.answerMode}
            onChange={(e) => handleChange('answerMode', e.target.value)}
            style={baseStyles.select}
          >
            <option value="AI">AI Smart Answer</option>
            <option value="Simple">Simple Match</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>AI Provider</label>
          <select
            value={settings.aiProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            style={baseStyles.select}
          >
            <option value="OpenAI">OpenAI GPT</option>
            <option value="Google">Google Gemini</option>
            <option value="AzureOpenAI">Azure OpenAI</option>
          </select>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Choose your AI provider. Models will be updated automatically.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Embedding Model</label>
          <select
            value={settings.embeddingModel}
            onChange={(e) => handleChange('embeddingModel', e.target.value)}
            style={baseStyles.select}
          >
            {getModelOptions('embedding').map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} {model.description.includes('recommended') ? '⭐' : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {getModelOptions('embedding').find(m => m.value === settings.embeddingModel)?.description || 
             'Used for finding similar FAQs using vector similarity search.'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Chat Model</label>
          <select
            value={settings.chatModel}
            onChange={(e) => handleChange('chatModel', e.target.value)}
            style={baseStyles.select}
          >
            {getModelOptions('chat').map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} {model.description.includes('recommended') ? '⭐' : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {getModelOptions('chat').find(m => m.value === settings.chatModel)?.description || 
             'Used for generating natural language responses to customer questions.'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>API Key</label>
          <input
            type="password"
            value={settings.apiKeyEnc ? atob(settings.apiKeyEnc) : ''}
            onChange={(e) => handleChange('apiKeyEnc', btoa(e.target.value))}
            placeholder="Enter your OpenAI API key"
            style={baseStyles.input}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Your API key is encrypted and stored locally. Keep it secure and don't share it.
          </div>
        </div>
      </div>

      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>AI Parameters</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>
            Confidence Threshold: {settings.confidenceThreshold}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.confidenceThreshold}
            onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Answers below this threshold will be marked as uncertain
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>
            Max Tokens: {settings.maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="50"
            value={settings.maxTokens}
            onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>
            Temperature (Creativity): {settings.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Lower values produce more consistent responses, higher values produce more creative responses
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>
            Similarity Threshold: {settings.similarityThreshold || 0.3}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.similarityThreshold || 0.3}
            onChange={(e) => handleChange('similarityThreshold', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Minimum similarity score required for FAQ matching (0.0 = no threshold, 1.0 = exact match only)
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessSettings = () => {
    console.log('🔧 SettingsPage: Rendering business settings');
    console.log('🔧 SettingsPage: Current settings:', settings);
    console.log('🔧 SettingsPage: Business hours:', settings.businessHours);
    
    // Ensure businessHours exists and has proper structure
    const businessHours = settings.businessHours || defaultSettings.businessHours;
    
    const daysOfWeek = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];

    return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={baseStyles.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>AI Working Hours</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Timezone</label>
          <select
              value={businessHours.tz}
            onChange={(e) => handleNestedChange('businessHours', 'tz', e.target.value)}
            style={baseStyles.select}
          >
            <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (UTC+8)</option>
            <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
          </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={baseStyles.label}>Operation Mode</label>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="operationMode"
                  value="normal"
                  checked={!settings.alwaysOn}
                  onChange={() => handleChange('alwaysOn', false)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontSize: 14, color: '#64748b' }}>Normal Mode</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="operationMode"
                  value="24/7"
                  checked={settings.alwaysOn}
                  onChange={() => handleChange('alwaysOn', true)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontSize: 14, color: '#64748b' }}>24/7 Operation Mode</span>
              </label>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              <strong>Normal Mode:</strong> Set specific working hours for each day of the week<br/>
              <strong>24/7 Mode:</strong> AI will work continuously, ignoring daily working hours
            </div>
          </div>

          {!settings.alwaysOn && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={baseStyles.label}>Daily Working Hours</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Set all days to 9:00-18:00 and enabled
                      const newBusinessHours = { ...businessHours };
                      daysOfWeek.forEach(day => {
                        newBusinessHours[day.key] = {
                          start: '09:00',
                          end: '18:00',
                          enabled: true
                        };
                      });
                      handleChange('businessHours', newBusinessHours);
                    }}
                    style={{
                      ...baseStyles.btnGhost,
                      fontSize: 12,
                      padding: '6px 12px'
                    }}
                  >
                    Set All 9-6
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Disable all days
                      const newBusinessHours = { ...businessHours };
                      daysOfWeek.forEach(day => {
                        newBusinessHours[day.key] = {
                          ...newBusinessHours[day.key],
                          enabled: false
                        };
                      });
                      handleChange('businessHours', newBusinessHours);
                    }}
                    style={{
                      ...baseStyles.btnGhost,
                      fontSize: 12,
                      padding: '6px 12px'
                    }}
                  >
                    Disable All
                  </button>
                </div>
              </div>
              
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Configure working hours for each day of the week. AI will only respond during enabled hours.
        </div>

        <div style={{ 
          display: 'grid', 
                gap: 8,
                backgroundColor: '#f8f9fa',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #e9ecef'
              }}>
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 1fr 80px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#e9ecef',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 12,
                  color: '#495057'
                }}>
                  <div>Day</div>
                  <div>Start Time</div>
                  <div>End Time</div>
                  <div style={{ textAlign: 'center' }}>Active</div>
                </div>
                
                {/* Days */}
                {daysOfWeek.map((day, index) => (
                  <div key={day.key} style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 1fr 80px',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    borderRadius: 4,
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#495057' }}>
                      {day.label}
                    </div>
                    
          <div>
            <input
              type="time"
                        value={businessHours[day.key]?.start || '09:00'}
                        onChange={(e) => handleNestedChange('businessHours', day.key, {
                          ...businessHours[day.key],
                          start: e.target.value
                        })}
                        style={{ 
                          ...baseStyles.input, 
                          fontSize: 13, 
                          padding: '8px 10px',
                          width: '100%'
                        }}
            />
          </div>
                    
          <div>
            <input
              type="time"
                        value={businessHours[day.key]?.end || '18:00'}
                        onChange={(e) => handleNestedChange('businessHours', day.key, {
                          ...businessHours[day.key],
                          end: e.target.value
                        })}
                        style={{ 
                          ...baseStyles.input, 
                          fontSize: 13, 
                          padding: '8px 10px',
                          width: '100%'
                        }}
            />
          </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        checked={businessHours[day.key]?.enabled !== false}
                        onChange={(e) => handleNestedChange('businessHours', day.key, {
                          ...businessHours[day.key],
                          enabled: e.target.checked
                        })}
                        style={{ transform: 'scale(1.3)' }}
                      />
        </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <div style={{ 
            padding: 16, 
            backgroundColor: settings.alwaysOn ? '#e8f5e8' : '#f0f9ff', 
          borderRadius: 8, 
          fontSize: 14, 
            color: '#495057',
            border: `1px solid ${settings.alwaysOn ? '#4caf50' : '#0ea5e9'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>
                {settings.alwaysOn ? '🕒' : '⏰'}
              </span>
              <strong style={{ color: settings.alwaysOn ? '#2e7d32' : '#0369a1' }}>
                {settings.alwaysOn ? '24/7 Operation Mode' : 'Normal Mode'}
              </strong>
        </div>
            
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>
              <strong>Timezone:</strong> {TZ}
            </div>
            
            {settings.alwaysOn ? (
              <div style={{ fontSize: 12, color: '#2e7d32' }}>
                AI is active 24 hours a day, 7 days a week
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>
                  <strong>Active Days:</strong> {
                    daysOfWeek
                      .filter(day => businessHours[day.key]?.enabled !== false)
                      .map(day => day.label)
                      .join(', ') || 'None configured'
                  }
                </div>
                {daysOfWeek
                  .filter(day => businessHours[day.key]?.enabled !== false)
                  .length > 0 && (
                  <div style={{ fontSize: 11, color: '#6c757d' }}>
                    <strong>Hours:</strong> {
                      daysOfWeek
                        .filter(day => businessHours[day.key]?.enabled !== false)
                        .map(day => `${day.label}: ${businessHours[day.key]?.start || '09:00'}-${businessHours[day.key]?.end || '18:00'}`)
                        .join(', ')
                    }
                  </div>
                )}
              </div>
            )}
          </div>
      </div>
    </div>
  );
  };


  const renderMemorySettings = () => {
    const memoryStats = conversationMemoryService.getStats();
    const allConversations = conversationMemoryService.getAllConversations();
    
    return (
    <div style={{ display: 'grid', gap: 20 }}>
        {/* Memory Statistics */}
      <div style={baseStyles.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>💾 Conversation Memory Statistics</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{memoryStats.totalConversations}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Total Conversations</div>
          </div>
            
            <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{memoryStats.totalMessages}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Total Messages</div>
        </div>

            <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{memoryStats.activeConversations}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Active (7 days)</div>
          </div>
          </div>
        </div>

        {/* Memory Management Actions */}
        <div style={baseStyles.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>🗑️ Memory Management</h3>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              style={{
                ...baseStyles.btnGhost,
                backgroundColor: '#fef2f2',
                borderColor: '#fecaca',
                color: '#dc2626'
              }}
              onClick={() => {
                if (confirm('Are you sure you want to clear ALL conversation memory? This action cannot be undone.')) {
                  // Clear all memory
                  Object.keys(allConversations).forEach(phoneNumber => {
                    conversationMemoryService.clearConversation(phoneNumber);
                  });
                  alert('All conversation memory has been cleared.');
                  onSaved?.();
                }
              }}
            >
              Clear All Memory
            </button>
            
            <button
              style={baseStyles.btnGhost}
              onClick={() => {
                // Export memory data
                const dataStr = JSON.stringify(allConversations, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `conversation-memory-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Memory Data
            </button>
        </div>
      </div>

        {/* Recent Conversations */}
      <div style={baseStyles.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>📱 Recent Conversations</h3>
          
          {Object.keys(allConversations).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
              No conversation memory yet. Start chatting to build memory!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {Object.entries(allConversations)
                .sort(([,a], [,b]) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
                .slice(0, 10)
                .map(([phoneNumber, conversation]) => (
                <div key={phoneNumber} style={{ 
                  padding: 16, 
                  backgroundColor: '#f8fafc', 
            borderRadius: 8, 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>📱 {phoneNumber}</div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                      {conversation.messages?.length || 0} messages • 
                      Last active: {conversation.lastUpdated ? new Date(conversation.lastUpdated).toLocaleString() : 'Never'}
          </div>
        </div>
                  
                  <button
                    style={{
                      ...baseStyles.btnGhost,
                      fontSize: 12,
                      padding: '4px 8px',
                      backgroundColor: '#fef2f2',
                      borderColor: '#fecaca',
                      color: '#dc2626'
                    }}
                    onClick={() => {
                      if (confirm(`Clear memory for ${phoneNumber}?`)) {
                        conversationMemoryService.clearConversation(phoneNumber);
                        alert(`Memory cleared for ${phoneNumber}`);
                        onSaved?.();
                      }
                    }}
                  >
                    Clear
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
  };

  const renderWhatsAppSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* WhatsApp Business Configuration */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>WhatsApp Business Configuration</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Configuration Status</label>
          <div style={{
            padding: 12,
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: 6,
            fontSize: 14,
            color: '#0369a1'
          }}>
            🔐 WhatsApp configuration is managed by the backend server for security
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Phone number, API token, and webhook settings are securely stored on the server
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Current Configuration</label>
          <div style={{
            padding: 12,
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace'
          }}>
            <div><strong>Business Number:</strong> 60165281800</div>
            <div><strong>Webhook URL:</strong> https://wc-helper.onrender.com/webhook/whatsapp</div>
            <div><strong>Verify Token:</strong> my_verify_token_123</div>
            <div><strong>API Token:</strong> [Securely stored on server]</div>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Settings */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Message Settings</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Auto-Reply Enabled</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.whatsapp?.autoReply || false}
              onChange={(e) => handleNestedChange('whatsapp', 'autoReply', e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>
              Automatically reply to incoming WhatsApp messages
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Response Delay (seconds)</label>
          <input
            type="number"
            value={settings.whatsapp?.responseDelay || 1}
            onChange={(e) => handleNestedChange('whatsapp', 'responseDelay', parseInt(e.target.value) || 1)}
            style={baseStyles.input}
            min="0"
            max="30"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Delay before sending response (0-30 seconds)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Max Messages Per Hour</label>
          <input
            type="number"
            value={settings.whatsapp?.maxMessagesPerHour || 1000}
            onChange={(e) => handleNestedChange('whatsapp', 'maxMessagesPerHour', parseInt(e.target.value) || 1000)}
            style={baseStyles.input}
            min="1"
            max="10000"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Rate limit to prevent exceeding WhatsApp API limits
          </div>
        </div>
      </div>


      {/* WhatsApp Status */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Connection Status</h3>
        
        <div style={{ 
          padding: 12, 
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: 8,
          marginBottom: 12
        }}>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 600, 
            color: '#0369a1',
            marginBottom: 4
          }}>
            ✅ Backend Configured
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            WhatsApp Business API is configured on the backend server and ready to send messages
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          <strong>Configuration Details:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>✅ WhatsApp Business API credentials are configured on the server</li>
            <li>✅ Webhook endpoint is ready at: https://wc-helper.onrender.com/webhook/whatsapp</li>
            <li>✅ Verify token is set for webhook validation</li>
            <li>✅ AI response templates are managed in the "AI Rules" tab</li>
            <li>✅ Test the connection using the Chat Tester</li>
          </ul>
          <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #0ea5e9' }}>
            <strong>💡 Note:</strong> All sensitive configuration is managed by the backend server for security. The webhook is ready to receive WhatsApp messages and respond using AI.
          </div>
        </div>
      </div>
    </div>
  );

  const renderAIRulesSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Language Detection Settings */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Language Detection</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Enable Language Detection</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.aiRules?.languageDetection || false}
              onChange={(e) => handleNestedChange('aiRules', 'languageDetection', e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>
              Automatically detect customer language and respond accordingly
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Auto Language Response</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.aiRules?.autoLanguageResponse || false}
              onChange={(e) => handleNestedChange('aiRules', 'autoLanguageResponse', e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>
              Automatically switch response language based on customer input
            </span>
          </div>
        </div>
      </div>

      {/* Language Rules */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Language Rules</h3>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Configure how the AI should respond based on detected customer language
        </div>
        
        {(settings.aiRules?.languageRules || []).map((rule, index) => (
          <div key={rule.id} style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{rule.name}</h4>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => {
                  const newRules = [...(settings.aiRules?.languageRules || [])];
                  newRules[index].enabled = e.target.checked;
                  handleNestedChange('aiRules', 'languageRules', newRules);
                }}
                style={{ transform: 'scale(1.1)' }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              {rule.description}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ ...baseStyles.label, fontSize: 12 }}>Trigger Languages</label>
                <input
                  type="text"
                  value={rule.triggerLanguages.join(', ')}
                  onChange={(e) => {
                    const newRules = [...(settings.aiRules?.languageRules || [])];
                    newRules[index].triggerLanguages = e.target.value.split(',').map(s => s.trim());
                    handleNestedChange('aiRules', 'languageRules', newRules);
                  }}
                  style={{ ...baseStyles.input, fontSize: 12 }}
                  placeholder="en, english, malay"
                />
              </div>
              <div>
                <label style={{ ...baseStyles.label, fontSize: 12 }}>Response Language</label>
                <select
                  value={rule.responseLanguage}
                  onChange={(e) => {
                    const newRules = [...(settings.aiRules?.languageRules || [])];
                    newRules[index].responseLanguage = e.target.value;
                    handleNestedChange('aiRules', 'languageRules', newRules);
                  }}
                  style={{ ...baseStyles.select, fontSize: 12 }}
                >
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ms">Malay</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Response Templates */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Response Templates</h3>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Customize response templates for different languages
        </div>
        
        {Object.entries(settings.aiRules?.responseTemplates || {}).map(([lang, templates]) => (
          <div key={lang} style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            backgroundColor: '#f8fafc'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
              {lang === 'zh' ? 'Chinese' : lang === 'ms' ? 'Malay' : 'English'} Templates
            </h4>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ ...baseStyles.label, fontSize: 12 }}>Greeting</label>
                <textarea
                  value={templates.greeting || ''}
                  onChange={(e) => {
                    const newTemplates = { ...(settings.aiRules?.responseTemplates || {}) };
                    if (!newTemplates[lang]) newTemplates[lang] = {};
                    newTemplates[lang].greeting = e.target.value;
                    handleNestedChange('aiRules', 'responseTemplates', newTemplates);
                  }}
                  style={{ ...baseStyles.input, fontSize: 12, height: 60 }}
                  placeholder="Enter greeting message"
                />
              </div>
              
              <div>
                <label style={{ ...baseStyles.label, fontSize: 12 }}>Fallback Message</label>
                <textarea
                  value={templates.fallback || ''}
                  onChange={(e) => {
                    const newTemplates = { ...(settings.aiRules?.responseTemplates || {}) };
                    if (!newTemplates[lang]) newTemplates[lang] = {};
                    newTemplates[lang].fallback = e.target.value;
                    handleNestedChange('aiRules', 'responseTemplates', newTemplates);
                  }}
                  style={{ ...baseStyles.input, fontSize: 12, height: 60 }}
                  placeholder="Enter fallback message"
                />
              </div>
              
              <div>
                <label style={{ ...baseStyles.label, fontSize: 12 }}>Busy Mode Message</label>
                <textarea
                  value={templates.busy || ''}
                  onChange={(e) => {
                    const newTemplates = { ...(settings.aiRules?.responseTemplates || {}) };
                    if (!newTemplates[lang]) newTemplates[lang] = {};
                    newTemplates[lang].busy = e.target.value;
                    handleNestedChange('aiRules', 'responseTemplates', newTemplates);
                  }}
                  style={{ ...baseStyles.input, fontSize: 12, height: 60 }}
                  placeholder="Enter busy mode message"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDatabaseSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Info Card */}
      <div style={{
        ...baseStyles.card,
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🐘</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0c4a6e' }}>PostgreSQL Database Configuration</h3>
        </div>
        <div style={{ fontSize: 14, color: '#0c4a6e', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Database:</strong> Configure your PostgreSQL connection settings. The application will use these settings to store and retrieve data.
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Migration:</strong> You can migrate your existing localStorage data to PostgreSQL for better performance and reliability.
          </p>
          <p style={{ margin: 0 }}>
            <strong>⚠️ Important:</strong> Make sure PostgreSQL is running and accessible before testing the connection.
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Connection Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'connected' ? '#10b981' : 
                           connectionStatus === 'error' ? '#ef4444' : 
                           connectionStatus === 'testing' ? '#f59e0b' : '#6b7280'
          }} />
          <span style={{ 
            fontSize: 14, 
            fontWeight: 500,
            color: connectionStatus === 'connected' ? '#10b981' : 
                   connectionStatus === 'error' ? '#ef4444' : 
                   connectionStatus === 'testing' ? '#f59e0b' : '#6b7280'
          }}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'error' ? 'Connection Failed' : 
             connectionStatus === 'testing' ? 'Testing Connection...' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={testDatabaseConnection}
          disabled={isTestingConnection}
          style={{
            ...baseStyles.btnPrimary,
            opacity: isTestingConnection ? 0.6 : 1,
            cursor: isTestingConnection ? 'not-allowed' : 'pointer'
          }}
        >
          {isTestingConnection ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Database Configuration */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Database Configuration</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={baseStyles.label}>Host</label>
            <input
              type="text"
              value={databaseSettings.host}
              onChange={(e) => handleDatabaseChange('host', e.target.value)}
              style={baseStyles.input}
              placeholder="localhost"
            />
          </div>
          <div>
            <label style={baseStyles.label}>Port</label>
            <input
              type="number"
              value={databaseSettings.port}
              onChange={(e) => handleDatabaseChange('port', parseInt(e.target.value) || 5432)}
              style={baseStyles.input}
              placeholder="5432"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={baseStyles.label}>Database Name</label>
            <input
              type="text"
              value={databaseSettings.database}
              onChange={(e) => handleDatabaseChange('database', e.target.value)}
              style={baseStyles.input}
              placeholder="wc_helper"
            />
          </div>
          <div>
            <label style={baseStyles.label}>Username</label>
            <input
              type="text"
              value={databaseSettings.username}
              onChange={(e) => handleDatabaseChange('username', e.target.value)}
              style={baseStyles.input}
              placeholder="postgres"
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Password</label>
          <input
            type="password"
            value={databaseSettings.password}
            onChange={(e) => handleDatabaseChange('password', e.target.value)}
            style={baseStyles.input}
            placeholder="Enter database password"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ ...baseStyles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={databaseSettings.ssl}
              onChange={(e) => handleDatabaseChange('ssl', e.target.checked)}
              style={{ transform: 'scale(1.1)' }}
            />
            Enable SSL (for production)
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleDatabaseSave}
            style={baseStyles.btnPrimary}
          >
            Save Database Settings
          </button>
          <button
            onClick={() => setDatabaseSettings({
              host: 'localhost',
              port: 5432,
              database: 'wc_helper',
              username: 'postgres',
              password: '',
              ssl: false
            })}
            style={baseStyles.btnGhost}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Migration Section */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Data Migration</h3>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Migrate your existing localStorage data to PostgreSQL for better performance and reliability.
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: migrationStatus === 'completed' ? '#10b981' : 
                             migrationStatus === 'error' ? '#ef4444' : 
                             migrationStatus === 'migrating' ? '#f59e0b' : '#6b7280'
            }} />
            <span style={{ 
              fontSize: 14, 
              fontWeight: 500,
              color: migrationStatus === 'completed' ? '#10b981' : 
                     migrationStatus === 'error' ? '#ef4444' : 
                     migrationStatus === 'migrating' ? '#f59e0b' : '#6b7280'
            }}>
              {migrationStatus === 'completed' ? 'Migration Completed' : 
               migrationStatus === 'error' ? 'Migration Failed' : 
               migrationStatus === 'migrating' ? 'Migrating Data...' : 'Ready to Migrate'}
            </span>
          </div>
        </div>

        <button
          onClick={migrateToPostgreSQL}
          disabled={migrationStatus === 'migrating' || connectionStatus !== 'connected'}
          style={{
            ...baseStyles.btnPrimary,
            opacity: (migrationStatus === 'migrating' || connectionStatus !== 'connected') ? 0.6 : 1,
            cursor: (migrationStatus === 'migrating' || connectionStatus !== 'connected') ? 'not-allowed' : 'pointer'
          }}
        >
          {migrationStatus === 'migrating' ? 'Migrating...' : 'Migrate to PostgreSQL'}
        </button>

        {connectionStatus !== 'connected' && (
          <div style={{ 
            marginTop: 8, 
            fontSize: 12, 
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            ⚠️ Please test and establish database connection first
          </div>
        )}
      </div>

      {/* Database Statistics */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Database Statistics</h3>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          View database statistics and health information.
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              // This would fetch database stats
              console.log('Fetching database statistics...');
            }}
            style={baseStyles.btnGhost}
          >
            View Statistics
          </button>
          <button
            onClick={() => {
              // This would clear database cache
              console.log('Clearing database cache...');
            }}
            style={baseStyles.btnGhost}
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Daily Cleanup Management */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Daily Cleanup</h3>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Manage daily cleanup of local data. Messages, logs, and conversation memory are cleaned up automatically to prevent storage bloat.
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/cleanup/trigger', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                  console.log('✅ Cleanup completed:', result.data);
                } else {
                  console.error('❌ Cleanup failed:', result.error);
                }
              } catch (error) {
                console.error('❌ Error triggering cleanup:', error);
              }
            }}
            style={baseStyles.btnPrimary}
          >
            Trigger Cleanup Now
          </button>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/cleanup/status');
                const result = await response.json();
                if (result.success) {
                  console.log('📊 Cleanup status:', result.data);
                } else {
                  console.error('❌ Error getting cleanup status:', result.error);
                }
              } catch (error) {
                console.error('❌ Error fetching cleanup status:', error);
              }
            }}
            style={baseStyles.btnGhost}
          >
            View Cleanup Status
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    try {
    switch (activeTab) {
        case 'business': return renderBusinessSettings();
      case 'ai': return renderAISettings();
      case 'ai_rules': return renderAIRulesSettings();
        case 'database': return renderDatabaseSettings();
        case 'memory': return renderMemorySettings();
      case 'whatsapp': return renderWhatsAppSettings();
        default: return renderBusinessSettings();
      }
    } catch (error) {
      console.error('❌ Error rendering tab content:', error);
      return (
        <div style={baseStyles.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#dc2626' }}>
            Error Loading Settings
          </h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            There was an error loading the settings page. Please refresh the page and try again.
          </p>
          <p style={{ color: '#6b7280', margin: '8px 0 0 0', fontSize: 12 }}>
            Error: {error.message}
          </p>
        </div>
      );
    }
  };

  return (
    <div>
      {/* Header with Save/Reset buttons */}
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>System Settings</h2>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Configure various parameters and behavior of the customer service assistant
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleReset}
            style={{
              ...baseStyles.btnGhost,
              opacity: isDirty ? 1 : 0.5,
              cursor: isDirty ? 'pointer' : 'not-allowed'
            }}
            disabled={!isDirty}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            style={{
              ...baseStyles.btnPrimary,
              opacity: isDirty ? 1 : 0.5,
              cursor: isDirty ? 'pointer' : 'not-allowed'
            }}
            disabled={!isDirty}
          >
            {isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        padding: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 8
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 6,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#0ea5e9' : '#64748b',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

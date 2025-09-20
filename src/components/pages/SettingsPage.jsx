import React, { useState, useEffect } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { baseStyles, breakpoints } from '../../utils/styles.js';
import { defaultSettings, TZ, AI_MODEL_OPTIONS } from '../../utils/constants.js';

export function SettingsPage({ onSaved }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const savedSettings = readLS(STORAGE_KEYS.settings, defaultSettings);
    setSettings(savedSettings);
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
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'ai', label: 'AI Config', icon: '🤖' },
    { id: 'ai_rules', label: 'AI Rules', icon: '📋' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
    { id: 'business', label: 'Business Hours', icon: '🕒' },
    { id: 'response', label: 'Response', icon: '💬' }
  ];

  const renderGeneralSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Basic Configuration</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>24/7 Operation Mode</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.alwaysOn}
              onChange={(e) => handleChange('alwaysOn', e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>
              When enabled, the system will work 24/7, not limited by business hours
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Busy Mode</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={settings.busyMode}
              onChange={(e) => handleChange('busyMode', e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: 14, color: '#64748b' }}>
              When enabled, a busy notice will be added before responses
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Preferred Language</label>
          <select
            value={settings.preferredLang}
            onChange={(e) => handleChange('preferredLang', e.target.value)}
            style={baseStyles.select}
          >
            <option value="auto">Auto Detect</option>
            <option value="zh">Chinese</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );

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
            placeholder="Enter your API key"
            style={baseStyles.input}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Key will be stored encrypted in your browser
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
      </div>
    </div>
  );

  const renderBusinessSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Business Hours Settings</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Timezone</label>
          <select
            value={settings.businessHours.tz}
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

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 16, 
          marginBottom: 16,
          [`@media (max-width: ${breakpoints.mobile})`]: {
            gridTemplateColumns: '1fr',
            gap: 12
          }
        }}>
          <div>
            <label style={baseStyles.label}>Start Time</label>
            <input
              type="time"
              value={settings.businessHours.start}
              onChange={(e) => handleNestedChange('businessHours', 'start', e.target.value)}
              style={baseStyles.input}
            />
          </div>
          <div>
            <label style={baseStyles.label}>End Time</label>
            <input
              type="time"
              value={settings.businessHours.end}
              onChange={(e) => handleNestedChange('businessHours', 'end', e.target.value)}
              style={baseStyles.input}
            />
          </div>
        </div>

        <div style={{ 
          padding: 12, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8, 
          fontSize: 14, 
          color: '#6c757d' 
        }}>
          <strong>Current Timezone:</strong> {TZ}<br/>
          <strong>Business Hours:</strong> {settings.businessHours.start} - {settings.businessHours.end}
        </div>
      </div>
    </div>
  );

  const renderResponseSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Response Configuration</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Default Reply</label>
          <textarea
            value={settings.fallbackReply}
            onChange={(e) => handleChange('fallbackReply', e.target.value)}
            placeholder="Default reply when the system cannot understand user questions"
            style={{
              ...baseStyles.input,
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Suggest maintaining a friendly and professional tone
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Busy Mode Notice</label>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
            When busy mode is enabled, this notice will be added before responses:
          </div>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 8, 
            fontSize: 14,
            fontStyle: 'italic'
          }}>
            {settings.busyMode ? 
              (settings.preferredLang === 'en' ? 
                "[We are experiencing high volume] " : 
                "【Currently experiencing high volume, there may be slight delays】 ") : 
              "Busy mode not enabled"
            }
          </div>
        </div>
      </div>

      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Test Configuration</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Current Configuration Preview</label>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 8, 
            fontSize: 13,
            fontFamily: 'monospace'
          }}>
            <div><strong>Answer Mode:</strong> {settings.answerMode}</div>
            <div><strong>AI Provider:</strong> {settings.aiProvider}</div>
            <div><strong>Confidence Threshold:</strong> {settings.confidenceThreshold}</div>
            <div><strong>Max Tokens:</strong> {settings.maxTokens}</div>
            <div><strong>Temperature:</strong> {settings.temperature}</div>
            <div><strong>24/7 Mode:</strong> {settings.alwaysOn ? 'Yes' : 'No'}</div>
            <div><strong>Busy Mode:</strong> {settings.busyMode ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWhatsAppSettings = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* WhatsApp Business Configuration */}
      <div style={baseStyles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>WhatsApp Business Configuration</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>WhatsApp Business Phone Number</label>
          <input
            type="text"
            value={settings.whatsapp?.phoneNumber || ''}
            onChange={(e) => handleNestedChange('whatsapp', 'phoneNumber', e.target.value)}
            style={baseStyles.input}
            placeholder="+1234567890"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Your WhatsApp Business phone number (include country code)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>WhatsApp Business API Token</label>
          <input
            type="password"
            value={settings.whatsapp?.apiToken || ''}
            onChange={(e) => handleNestedChange('whatsapp', 'apiToken', e.target.value)}
            style={baseStyles.input}
            placeholder="Enter your WhatsApp Business API token"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Get this from Meta Business Manager → WhatsApp Business API
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Webhook Verify Token</label>
          <input
            type="text"
            value={settings.whatsapp?.webhookToken || ''}
            onChange={(e) => handleNestedChange('whatsapp', 'webhookToken', e.target.value)}
            style={baseStyles.input}
            placeholder="Enter webhook verification token"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Custom token for webhook verification (create a secure random string)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={baseStyles.label}>Webhook URL</label>
          <input
            type="text"
            value={settings.whatsapp?.webhookUrl || ''}
            onChange={(e) => handleNestedChange('whatsapp', 'webhookUrl', e.target.value)}
            style={baseStyles.input}
            placeholder="https://yourdomain.com/webhook/whatsapp"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Your webhook endpoint URL for receiving WhatsApp messages
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
          backgroundColor: settings.whatsapp?.phoneNumber && settings.whatsapp?.apiToken ? '#f0f9ff' : '#fef2f2',
          border: `1px solid ${settings.whatsapp?.phoneNumber && settings.whatsapp?.apiToken ? '#0ea5e9' : '#f87171'}`,
          borderRadius: 8,
          marginBottom: 12
        }}>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 600, 
            color: settings.whatsapp?.phoneNumber && settings.whatsapp?.apiToken ? '#0369a1' : '#dc2626',
            marginBottom: 4
          }}>
            {settings.whatsapp?.phoneNumber && settings.whatsapp?.apiToken ? '✅ Ready to Connect' : '❌ Configuration Incomplete'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {settings.whatsapp?.phoneNumber && settings.whatsapp?.apiToken 
              ? 'WhatsApp Business API is configured and ready to send messages'
              : 'Please configure phone number and API token to enable WhatsApp integration'
            }
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          <strong>Setup Instructions:</strong>
          <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>Get WhatsApp Business API access from Meta Business Manager</li>
            <li>Create a webhook endpoint on your server</li>
            <li>Configure the webhook URL in Meta Business Manager</li>
            <li>Enter your phone number and API token above</li>
            <li>Configure AI response templates in the "AI Rules" tab</li>
            <li>Test the connection using the Chat Tester</li>
          </ol>
          <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #0ea5e9' }}>
            <strong>💡 Note:</strong> Message templates are managed in the "AI Rules" tab. The AI will use those templates to generate responses for WhatsApp messages.
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'ai': return renderAISettings();
      case 'ai_rules': return renderAIRulesSettings();
      case 'whatsapp': return renderWhatsAppSettings();
      case 'business': return renderBusinessSettings();
      case 'response': return renderResponseSettings();
      default: return renderGeneralSettings();
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

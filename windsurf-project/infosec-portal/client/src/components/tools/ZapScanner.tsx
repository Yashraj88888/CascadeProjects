import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

type AlertsResponse = { alerts: any[] };

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const ZapScanner: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [zapUrl, setZapUrl] = useState('http://localhost:8080');
  const [zapApiKey, setZapApiKey] = useState('');
  const [spiderId, setSpiderId] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [spiderProgress, setSpiderProgress] = useState<number>(0);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [outputLog, setOutputLog] = useState<LogEntry[]>([]);
  const [spiderStartTime, setSpiderStartTime] = useState<number | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [spiderElapsed, setSpiderElapsed] = useState<string>('');
  const [scanElapsed, setScanElapsed] = useState<string>('');
  const [spiderUrls, setSpiderUrls] = useState<string[]>([]);
  const [showSpiderResults, setShowSpiderResults] = useState(false);
  const spiderTimer = useRef<number | null>(null);
  const scanTimer = useRef<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setOutputLog(prev => [...prev, { timestamp, message, type }]);
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }, 100);
  };

  const formatElapsedTime = (startTime: number): string => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  };

  useEffect(() => {
    return () => {
      if (spiderTimer.current) window.clearInterval(spiderTimer.current);
      if (scanTimer.current) window.clearInterval(scanTimer.current);
    };
  }, []);

  useEffect(() => {
    if (spiderStartTime && spiderProgress < 100) {
      const timer = setInterval(() => {
        setSpiderElapsed(formatElapsedTime(spiderStartTime));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [spiderStartTime, spiderProgress]);

  useEffect(() => {
    if (scanStartTime && scanProgress < 100) {
      const timer = setInterval(() => {
        setScanElapsed(formatElapsedTime(scanStartTime));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [scanStartTime, scanProgress]);

  const startSpider = async () => {
    if (!targetUrl) return;
    setError(null);
    setHealth(null);
    setAlerts([]);
    setSpiderProgress(0);
    setScanProgress(0);
    setSpiderUrls([]);
    setShowSpiderResults(false);
    setLoading(true);
    const startTime = Date.now();
    setSpiderStartTime(startTime);
    setSpiderElapsed('0s');
    
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    addLog(`Starting Spider Scan for: ${targetUrl}`, 'info');
    addLog(`Scan Mode: Recursive crawling`, 'info');
    addLog(`ZAP Instance: ${zapUrl}`, 'info');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    
    try {
      const { data } = await api.post('/zap/spider', { targetUrl, zapUrl, zapApiKey });
      const scanId = data.scanId;
      setSpiderId(scanId);
      addLog(`✓ Spider scan initiated successfully`, 'success');
      addLog(`Scan ID: ${scanId}`, 'info');
      addLog(`Starting to crawl web pages...`, 'info');
      
      const checkSpiderStatus = async () => {
        try {
          // Get current status
          const statusRes = await api.get('/zap/spider/status', { 
            params: { scanId, zapUrl, zapApiKey } 
          });
          
          const currentProgress = parseInt(statusRes.data.status);
          setSpiderProgress(currentProgress);
          
          // Get results
          const resultsRes = await api.get('/zap/spider/results', { 
            params: { scanId, zapUrl, zapApiKey } 
          });
          
          if (resultsRes.data?.results?.length > 0) {
            setSpiderUrls(prevUrls => {
              // Create a Set to ensure unique URLs
              const urlSet = new Set([...prevUrls, ...resultsRes.data.results]);
              const uniqueUrls = Array.from(urlSet);
              
              // Log when new URLs are found
              if (uniqueUrls.length > prevUrls.length) {
                const newUrls = uniqueUrls.length - (prevUrls.length || 0);
                addLog(`Found ${newUrls} new URLs (${uniqueUrls.length} total)`, 'info');
              }
              
              return uniqueUrls;
            });
          }
          
          // Check if scan is complete
          if (currentProgress >= 100) {
            clearInterval(intervalId);
            setSpiderId(null);
            setLoading(false);
            setShowSpiderResults(true);
            addLog(`✓ Spider scan completed - Found ${spiderUrls.length} unique URLs`, 'success');
          }
        } catch (e) {
          console.error('Error in spider scan:', e);
          addLog('⚠ Error checking spider status', 'warning');
          clearInterval(intervalId);
          setLoading(false);
        }
      };
      
      // Start checking status every 1.2 seconds
      const intervalId = setInterval(checkSpiderStatus, 1200);
      
      // Initial check
      checkSpiderStatus();
      
      // Return cleanup function
      return () => clearInterval(intervalId);
      
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || 'Failed to start spider';
      setError(errMsg);
      addLog(`✗ Error: ${errMsg}`, 'error');
      addLog(`Details: ${e?.response?.data?.details || e.message}`, 'error');
      setLoading(false);
    }
  };

  const startActiveScan = async () => {
    if (!targetUrl) return;
    setError(null);
    setHealth(null);
    setScanProgress(0);
    setLoading(true);
    const startTime = Date.now();
    setScanStartTime(startTime);
    setScanElapsed('0s');
    
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'warning');
    addLog(`Starting Active Scan for: ${targetUrl}`, 'warning');
    addLog(`Scan Type: Comprehensive vulnerability testing`, 'info');
    addLog(`ZAP Instance: ${zapUrl}`, 'info');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'warning');
    
    try {
      const { data } = await api.post('/zap/activescan', { targetUrl, zapUrl, zapApiKey });
      setScanId(data.scanId);
      addLog(`✓ Active scan initiated successfully`, 'success');
      addLog(`Scan ID: ${data.scanId}`, 'info');
      addLog(`Testing for vulnerabilities: XSS, SQLi, CSRF, etc.`, 'info');
      
      let lastProgress = 0;
      scanTimer.current = window.setInterval(async () => {
        const { data: s } = await api.get(`/zap/activescan/${data.scanId}`, { params: { zapUrl, zapApiKey } });
        setScanProgress(s.status);
        
        if (s.status !== lastProgress && s.status % 20 === 0) {
          addLog(`Active scan progress: ${s.status}% complete`, 'info');
          lastProgress = s.status;
        }
        
        if (s.status >= 100) {
          if (scanTimer.current) window.clearInterval(scanTimer.current);
          const elapsed = formatElapsedTime(startTime);
          setScanElapsed(elapsed);
          addLog(`✓ Active scan completed in ${elapsed}`, 'success');
          addLog(`Fetching vulnerability alerts...`, 'info');
          
          // fetch alerts
          const { data: a } = await api.get<AlertsResponse>(`/zap/alerts`, { params: { baseUrl: targetUrl, zapUrl, zapApiKey } });
          setAlerts(a.alerts || []);
          addLog(`Found ${a.alerts?.length || 0} security alerts`, a.alerts?.length > 0 ? 'warning' : 'success');
          
          if (a.alerts && a.alerts.length > 0) {
            const highRisk = a.alerts.filter((alert: any) => alert.risk === 'High').length;
            const mediumRisk = a.alerts.filter((alert: any) => alert.risk === 'Medium').length;
            const lowRisk = a.alerts.filter((alert: any) => alert.risk === 'Low').length;
            addLog(`  - High Risk: ${highRisk}`, highRisk > 0 ? 'error' : 'info');
            addLog(`  - Medium Risk: ${mediumRisk}`, mediumRisk > 0 ? 'warning' : 'info');
            addLog(`  - Low Risk: ${lowRisk}`, 'info');
          }
          
          setLoading(false);
        }
      }, 1500);
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || 'Failed to start active scan';
      setError(errMsg);
      addLog(`✗ Error: ${errMsg}`, 'error');
      addLog(`Details: ${e?.response?.data?.details || e.message}`, 'error');
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    setError(null);
    setHealth(null);
    addLog(`Checking ZAP connection at ${zapUrl}...`, 'info');
    try {
      const { data } = await api.get('/zap/health', { params: { zapUrl, zapApiKey } });
      setHealth(`ZAP OK - Version: ${data.version || 'unknown'} (${data.zapUrl})`);
      addLog(`✓ ZAP is online and ready`, 'success');
      addLog(`Version: ${data.version || 'unknown'}`, 'info');
    } catch (e: any) {
      const errData = e?.response?.data;
      const errMsg = errData?.error || 'ZAP not reachable';
      const helpMsg = errData?.help || '';
      setError(`${errMsg}\n\n${helpMsg}\n\nSee ZAP_SETUP_GUIDE.md for detailed instructions.`);
      addLog(`✗ ${errMsg}`, 'error');
    }
  };

  const clearOutput = () => {
    setOutputLog([]);
    addLog('Output console cleared', 'info');
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>OWASP ZAP</h2>
      <p className="ll-muted">Run spider and active scan, then view alerts.</p>

      <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
        <div className="ll-row" style={{ justifyContent: 'space-between' }}>
          <input
            className="ll-input"
            value={zapUrl}
            onChange={(e) => setZapUrl(e.target.value)}
            placeholder="ZAP URL (e.g., http://localhost:8080)"
            style={{ flex: 1, minWidth: 260 }}
          />
          <input
            className="ll-input"
            value={zapApiKey}
            onChange={(e) => setZapApiKey(e.target.value)}
            placeholder="ZAP API Key (if enabled)"
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="ll-button" onClick={checkHealth} disabled={loading}>Check ZAP</button>
        </div>
        {health && <div style={{ color: '#10b981', marginTop: 10 }}>{health}</div>}
        {error && <div style={{ color: '#f87171', marginTop: 10, whiteSpace: 'pre-wrap', fontSize: '13px' }}>{error}</div>}
      </div>

      <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
        <div className="ll-row">
          <input
            className="ll-input"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ flex: 1, minWidth: 260 }}
          />
          <button className="ll-button" onClick={startSpider} disabled={loading || !targetUrl}>
            {loading ? 'Working...' : 'Start Spider'}
          </button>
          <button className="ll-button" onClick={startActiveScan} disabled={loading || !targetUrl}>
            {loading ? 'Working...' : 'Start Active Scan'}
          </button>
        </div>
      </div>
      {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}

      {/* Output Console */}
      <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>📋 Scan Output Console</strong>
          <button 
            className="ll-button" 
            onClick={clearOutput} 
            style={{ padding: '4px 12px', fontSize: '13px' }}
          >
            Clear
          </button>
        </div>
        <div 
          ref={outputRef}
          style={{
            background: '#000000',
            border: '1px solid #7c3aed',
            borderRadius: 6,
            padding: 12,
            height: 320,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.6
          }}
        >
          {outputLog.length === 0 ? (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              Scan output will appear here...
            </div>
          ) : (
            outputLog.map((log, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span>{' '}
                <span style={{ color: getLogColor(log.type) }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Progress Bars */}
      {(spiderId || scanId) && (
        <div className="ll-grid" style={{ marginTop: 12 }}>
          {spiderId && (
            <div className="ll-card ll-card--purple">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>🕷️ Spider Progress: {spiderProgress}%</strong>
                {spiderElapsed && <span className="ll-muted">⏱️ {spiderElapsed}</span>}
              </div>
              <div style={{ height: 10, background: '#0b1220', borderRadius: 6 }}>
                <div style={{ 
                  height: '100%', 
                  width: `${spiderProgress}%`, 
                  background: 'linear-gradient(90deg, #3b82f6, #2563eb)', 
                  borderRadius: 6,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
          {scanId && (
            <div className="ll-card ll-card--purple">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>🔍 Active Scan Progress: {scanProgress}%</strong>
                {scanElapsed && <span className="ll-muted">⏱️ {scanElapsed}</span>}
              </div>
              <div style={{ height: 10, background: '#0b1220', borderRadius: 6 }}>
                <div style={{ 
                  height: '100%', 
                  width: `${scanProgress}%`, 
                  background: 'linear-gradient(90deg, #10b981, #059669)', 
                  borderRadius: 6,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show Spider Results Button (if hidden) */}
      {!showSpiderResults && spiderUrls.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button 
            className="ll-button"
            onClick={() => setShowSpiderResults(true)}
            style={{ padding: '8px 16px' }}
          >
            🕷️ Show Spider Scan Results ({spiderUrls.length} URLs)
          </button>
        </div>
      )}

      {/* Spider Scan Results */}
      {showSpiderResults && spiderUrls.length > 0 && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>🕷️ Spider Scan Results - URLs Discovered ({spiderUrls.length})</strong>
            <button 
              className="ll-button" 
              onClick={() => setShowSpiderResults(false)}
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              Hide
            </button>
          </div>
          
          <div style={{
            background: '#000000',
            border: '1px solid #7c3aed',
            borderRadius: 6,
            padding: 12,
            maxHeight: 400,
            overflowY: 'auto'
          }}>
            {spiderUrls.map((url, idx) => {
              // Categorize URLs
              const isAsset = url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/i);
              const isAPI = url.includes('/api/');
              const isAdmin = url.includes('/admin');
              const isAuth = url.match(/(login|register|signin|signup|auth)/i);
              
              let color = '#9ca3af'; // default
              let icon = '📄';
              
              if (isAdmin) {
                color = '#ef4444';
                icon = '🔐';
              } else if (isAuth) {
                color = '#f59e0b';
                icon = '🔑';
              } else if (isAPI) {
                color = '#3b82f6';
                icon = '🔌';
              } else if (isAsset) {
                color = '#6b7280';
                icon = '📦';
              }
              
              return (
                <div 
                  key={idx} 
                  style={{ 
                    marginBottom: 6, 
                    padding: '6px 8px',
                    background: '#0b1220',
                    borderRadius: 4,
                    borderLeft: `3px solid ${color}`,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ color, flex: 1, wordBreak: 'break-all' }}>{url}</span>
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
            <strong>Legend:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 6 }}>
              <div><span style={{ color: '#ef4444' }}>🔐 Admin</span> pages</div>
              <div><span style={{ color: '#f59e0b' }}>🔑 Authentication</span> pages</div>
              <div><span style={{ color: '#3b82f6' }}>🔌 API</span> endpoints</div>
              <div><span style={{ color: '#6b7280' }}>📦 Assets</span> (CSS, JS, images)</div>
              <div><span style={{ color: '#9ca3af' }}>📄 Regular</span> pages</div>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: '8px 0' }}>🚨 Vulnerability Alerts ({alerts.length})</h3>
          <div className="ll-grid">
            {alerts.map((a: any, i: number) => {
              const riskColors: Record<string, string> = {
                'High': '#ef4444',
                'Medium': '#f59e0b',
                'Low': '#3b82f6',
                'Informational': '#6b7280'
              };
              const riskColor = riskColors[a.risk] || '#93c5fd';
              
              return (
                <div key={i} className="ll-card ll-card--purple">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <strong style={{ flex: 1 }}>{a.alert}</strong>
                    <span style={{ 
                      color: riskColor, 
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: `${riskColor}20`,
                      fontSize: '12px'
                    }}>
                      {a.risk}
                    </span>
                  </div>
                  
                  <div className="ll-muted" style={{ marginTop: 8, fontSize: '13px' }}>
                    {a.description}
                  </div>
                  
                  {a.solution && (
                    <div style={{ marginTop: 8, fontSize: '13px', color: '#10b981' }}>
                      <strong>💡 Solution:</strong> {a.solution}
                    </div>
                  )}
                  
                  {a.instances && a.instances.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: 4 }}>
                        <strong>📍 Affected URLs ({a.instances.length}):</strong>
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6b7280',
                        background: '#0b1220',
                        padding: 6,
                        borderRadius: 4,
                        maxHeight: 80,
                        overflowY: 'auto'
                      }}>
                        {a.instances.slice(0, 3).map((inst: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: 2 }}>
                            → {inst.uri}
                          </div>
                        ))}
                        {a.instances.length > 3 && (
                          <div style={{ color: '#9ca3af', marginTop: 4 }}>
                            ... and {a.instances.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {a.confidence && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: '#9ca3af' }}>
                      Confidence: {a.confidence}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZapScanner;

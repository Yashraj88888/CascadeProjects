import React, { useState } from 'react';
import api from '../../services/api';

const presets = [
  { label: 'Quick (-T4 -F)', value: '-T4 -F' },
  { label: 'Service Detect (-sV)', value: '-sV' },
  { label: 'Aggressive (-T4 -A -v)', value: '-T4 -A -v' },
  { label: 'Vuln Scripts (--script=vuln)', value: '--script=vuln' },
];

interface PortInfo {
  port: number;
  state: string;
  service: string;
  version?: string;
}

// Define styles outside the component
const tableHeaderStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  color: '#9ca3af',
  fontSize: '13px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tableCellStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #2d3748',
  color: '#e2e8f0'
};

const NmapScanner: React.FC = () => {
  const [target, setTarget] = useState('');
  const [options, setOptions] = useState('-sV');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [openPorts, setOpenPorts] = useState<PortInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showRawOutput, setShowRawOutput] = useState(false);

  const parseNmapOutput = (output: string): PortInfo[] => {
    const portRegex = /(\d+)\/tcp\s+(\w+)\s+(\S+)(?:\s+(.+))?/g;
    const ports: PortInfo[] = [];
    let match;
    
    while ((match = portRegex.exec(output)) !== null) {
      ports.push({
        port: parseInt(match[1]),
        state: match[2],
        service: match[3],
        version: match[4]?.trim()
      });
    }
    
    return ports;
  };

  const startScan = async () => {
    if (!target) {
      setError('Please enter a target to scan');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult('');
    setOpenPorts([]);
    setIsScanning(true);
    setScanProgress(0);
    
    // Simulate progress (since we can't get real-time progress from the API)
    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 1000);
    
    try {
      const res = await api.post('/nmap/scan', { target, options });
      setResult(res.data?.results || '');
      
      // Parse the results to extract open ports
      if (res.data?.results) {
        const ports = parseNmapOutput(res.data.results);
        setOpenPorts(ports);
      }
      
      setScanProgress(100);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || 'Scan failed';
      setError(`${errorMsg}. ${e?.response?.data?.details || ''}`.trim());
      console.error('Nmap scan error:', e);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setIsScanning(false);
    }
  };
  
  const getPortStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'open': return '#10b981';
      case 'filtered': return '#f59e0b';
      case 'closed': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Nmap Port Scanner</h2>
      <p className="ll-muted">Scan targets for open ports and services. Results will be displayed below.</p>

      <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
        <div className="ll-grid" style={{ maxWidth: 1000, gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>
              Target Host / IP
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="ll-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., 192.168.1.1, example.com, or 192.168.1.0/24"
                style={{ flex: 1 }}
                disabled={loading}
              />
              <button 
                className="ll-button" 
                onClick={startScan} 
                disabled={loading || !target.trim()}
                style={{ minWidth: '120px' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="spinner">⏳</span> Scanning...
                  </span>
                ) : 'Start Scan'}
              </button>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>
              Scan Options
            </label>
            <div className="ll-row" style={{ flexWrap: 'wrap', gap: '6px' }}>
              {presets.map(p => (
                <button
                  key={p.value}
                  onClick={() => setOptions(p.value)}
                  style={{
                    padding: '6px 12px',
                    background: options === p.value ? '#7c3aed' : '#1e1e2d',
                    border: `1px solid ${options === p.value ? '#8b5cf6' : '#2d3748'}`,
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                  }}
                  disabled={loading}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>
              Custom Options
            </label>
            <input
              className="ll-input"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="e.g., -sS -p 80,443,8000-9000"
              disabled={loading}
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Common options: -sS (SYN scan), -sV (service detection), -A (aggressive scan)
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#2a1e2e',
            borderLeft: '4px solid #ef4444',
            borderRadius: '4px',
            color: '#f87171',
            fontSize: '14px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {isScanning && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Scan in progress...</span>
              <span>{Math.round(scanProgress)}%</span>
            </div>
            <div style={{
              height: '6px',
              background: '#1e1e2d',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${scanProgress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)',
                transition: 'width 0.3s ease',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        )}
      </div>

      {openPorts.length > 0 && (
        <div className="ll-card ll-card--purple" style={{ marginTop: '16px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
            Scan Results: {target}
            <span style={{
              marginLeft: '12px',
              fontSize: '14px',
              fontWeight: 'normal',
              color: '#9ca3af'
            }}>
              {openPorts.length} {openPorts.length === 1 ? 'port' : 'ports'} found
            </span>
          </h3>
          
          <div style={{
            overflowX: 'auto',
            borderRadius: '6px',
            border: '1px solid #2d3748'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{
                  background: '#1e1e2d',
                  borderBottom: '1px solid #2d3748'
                }}>
                  <th style={tableHeaderStyle}>Port</th>
                  <th style={tableHeaderStyle}>State</th>
                  <th style={tableHeaderStyle}>Service</th>
                  <th style={tableHeaderStyle}>Version</th>
                </tr>
              </thead>
              <tbody>
                {openPorts.map((portInfo, index) => (
                  <tr 
                    key={`${portInfo.port}-${index}`}
                    style={{
                      background: index % 2 === 0 ? '#0f111a' : 'transparent',
                      borderBottom: '1px solid #2d3748'
                    }}
                  >
                    <td style={tableCellStyle}>
                      <div style={{
                        display: 'inline-block',
                        background: '#1e1e2d',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#8b5cf6'
                      }}>
                        {portInfo.port}/tcp
                      </div>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getPortStateColor(portInfo.state)
                        }} />
                        {portInfo.state}
                      </div>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{ fontFamily: 'monospace' }}>
                        {portInfo.service}
                      </div>
                    </td>
                    <td style={{ ...tableCellStyle, color: '#9ca3af' }}>
                      {portInfo.version || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {result && (
            <div style={{ marginTop: '20px' }}>
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => setShowRawOutput(prev => !prev)}
              >
                <h4 style={{ margin: 0, color: '#9ca3af' }}>
                  {showRawOutput ? '▼' : '▶'} Raw Nmap Output
                </h4>
              </div>
              
              {showRawOutput && (
                <pre style={{
                  background: '#0f111a',
                  padding: '12px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  color: '#e2e8f0',
                  border: '1px solid #2d3748',
                  maxHeight: '400px',
                  margin: 0
                }}>
                  {result}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NmapScanner;

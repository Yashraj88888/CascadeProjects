import React, { useRef, useState, useEffect } from 'react';
import api from '../../services/api';

interface PacketData {
  protocols: Record<string, number>;
  sources: Record<string, number>;
  destinations: Record<string, number>;
  totalPackets: number;
  shown: number;
}

interface LivePacket {
  num: string;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  length: string;
}

const WiresharkAnalyzer: React.FC = () => {
  // Live capture state
  const [captureUrl, setCaptureUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<any>(null);
  const [packetData, setPacketData] = useState<PacketData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [livePackets, setLivePackets] = useState<LivePacket[]>([]);
  
  // File upload state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollInterval = useRef<number | null>(null);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  // Start live capture
  const startCapture = async () => {
    if (!captureUrl) {
      setError('Please enter a valid URL');
      return;
    }

    // Validate URL format
    try {
      new URL(captureUrl);
    } catch (e) {
      setError('Please enter a valid URL (include http:// or https://)');
      return;
    }

    setError(null);
    setCapturing(true);
    setPacketData(null);
    setCaptureStatus(null);
    setElapsed(0);
    setLivePackets([]);

    try {
      const { data } = await api.post('/api/wireshark/capture/start', {
        url: captureUrl,
        duration
      });
      
      if (!data?.captureId) {
        throw new Error('No capture ID received from server');
      }
      
      setCaptureId(data.captureId);
      
      // Poll for status updates and live packets
      pollInterval.current = window.setInterval(async () => {
        try {
          const statusRes = await api.get(`/api/wireshark/capture/${data.captureId}/status`);
          setCaptureStatus(statusRes.data);
          setElapsed(Math.floor((statusRes.data.elapsed || 0) / 1000));

          // Fetch live packets during capture
          if (statusRes.data.status === 'running') {
            try {
              const liveRes = await api.get(`/api/wireshark/capture/${data.captureId}/live`, {
                params: { limit: 20 }
              });
              if (liveRes.data && Array.isArray(liveRes.data)) {
                setLivePackets(liveRes.data);
              }
            } catch (liveErr) {
              console.warn('Error fetching live packets:', liveErr);
            }
          }

          // If completed, fetch full analysis
          if (statusRes.data.status === 'completed' || statusRes.data.status === 'stopped') {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
            setCapturing(false);
            
            try {
              const packetsRes = await api.get(`/api/wireshark/capture/${data.captureId}/packets`);
              setPacketData(packetsRes.data);
            } catch (packetErr) {
              console.error('Error fetching packet data:', packetErr);
              setError('Failed to load packet details');
            }
          }
        } catch (err) {
          console.error('Poll error:', err);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
          }
          setCapturing(false);
          setError('Error during capture. Please try again.');
        }
      }, 2000);
      
    } catch (e: any) {
      console.error('Start capture error:', e);
      setCapturing(false);
      setError(e.response?.data?.error || 'Failed to start capture');
      setError(e?.response?.data?.error || 'Failed to start capture');
      setCapturing(false);
    }
  };

  // Cleanup function to clear intervals
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  // Stop capture
  const stopCapture = async () => {
    if (!captureId) {
      setError('No active capture to stop');
      return;
    }
    
    try {
      setCapturing(false);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      
      await api.post(`/api/wireshark/capture/stop/${captureId}`);
      
      // Final fetch of packet data
      try {
        const packetsRes = await api.get(`/api/wireshark/capture/${captureId}/packets`);
        setPacketData(packetsRes.data);
      } catch (packetErr) {
        console.error('Error fetching final packet data:', packetErr);
        setError('Capture stopped, but failed to load final packet details');
      }
      await api.post(`/wireshark/capture/stop/${captureId}`);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      setCapturing(false);
      
      // Fetch final packets
      setTimeout(async () => {
        try {
          const packetsRes = await api.get(`/wireshark/capture/${captureId}/packets`);
          setPacketData(packetsRes.data);
        } catch (err) {
          console.error('Failed to fetch packets:', err);
        }
      }, 1000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to stop capture');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('pcap', file);
      const res = await api.post('/wireshark/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📡 Wireshark Live Traffic Analyzer</h2>
      <p className="ll-muted">
        Capture and analyze real-time network traffic for any website URL, or upload existing PCAP files.
      </p>

      {/* Live Capture Section */}
      <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>🔴 Live Traffic Capture</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
          <div>
            <label className="ll-label">Website URL</label>
            <input
              className="ll-input"
              type="text"
              placeholder="https://example.com"
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              disabled={capturing}
            />
          </div>
          
          <div>
            <label className="ll-label">Duration (seconds)</label>
            <input
              className="ll-input"
              type="number"
              min="10"
              max="300"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              disabled={capturing}
              style={{ width: 100 }}
            />
          </div>
          
          {!capturing ? (
            <button 
              className="ll-button" 
              onClick={startCapture} 
              disabled={!captureUrl}
            >
              🎬 Start Capture
            </button>
          ) : (
            <button 
              className="ll-button" 
              onClick={stopCapture}
              style={{ background: '#ef4444' }}
            >
              ⏹️ Stop
            </button>
          )}
        </div>

        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {/* Capture Status */}
      {(capturing || captureStatus) && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>📊 Capture Status</strong>
            {capturing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 10, 
                  height: 10, 
                  background: '#ef4444', 
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite'
                }} />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>CAPTURING</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <div className="ll-muted">Target Host</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14 }}>{captureStatus?.host || 'N/A'}</div>
            </div>
            <div>
              <div className="ll-muted">Status</div>
              <div style={{ 
                color: capturing ? '#f59e0b' : '#10b981',
                fontWeight: 600
              }}>
                {capturing ? 'Running' : captureStatus?.status || 'N/A'}
              </div>
            </div>
            <div>
              <div className="ll-muted">Elapsed Time</div>
              <div style={{ fontWeight: 600 }}>{elapsed}s / {duration}s</div>
            </div>
            <div>
              <div className="ll-muted">Packets Captured</div>
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>
                {captureStatus?.packetCount || 0}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {capturing && (
            <div style={{ marginTop: 12 }}>
              <div style={{ 
                height: 6, 
                background: '#1f2937', 
                borderRadius: 3, 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  width: `${(elapsed / duration) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                  transition: 'width 1s linear'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Packets Table */}
      {capturing && livePackets.length > 0 && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>📡 Live Packets (Last {livePackets.length})</strong>
            <div style={{ fontSize: 12, color: '#10b981' }}>
              ● Updating every 2 seconds
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              fontSize: 12, 
              fontFamily: 'monospace',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ background: '#0b1220', borderBottom: '2px solid #7c3aed' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#9ca3af' }}>#</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#9ca3af' }}>Time</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#9ca3af' }}>Source IP</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#9ca3af' }}>Destination IP</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#9ca3af' }}>Protocol</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', color: '#9ca3af' }}>Length</th>
                </tr>
              </thead>
              <tbody>
                {livePackets.map((pkt, idx) => {
                  // Color code protocols
                  let protoColor = '#9ca3af';
                  if (pkt.protocol === 'TCP') protoColor = '#3b82f6';
                  else if (pkt.protocol === 'UDP') protoColor = '#10b981';
                  else if (pkt.protocol === 'DNS') protoColor = '#f59e0b';
                  else if (pkt.protocol.includes('TLS') || pkt.protocol.includes('SSL')) protoColor = '#a78bfa';
                  else if (pkt.protocol.includes('HTTP')) protoColor = '#06b6d4';
                  
                  return (
                    <tr 
                      key={`${pkt.num}-${idx}`} 
                      style={{ 
                        borderBottom: '1px solid #1f2937',
                        background: idx % 2 === 0 ? '#0b1220' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '6px', color: '#6b7280' }}>{pkt.num}</td>
                      <td style={{ padding: '6px', color: '#9ca3af' }}>{parseFloat(pkt.time).toFixed(3)}s</td>
                      <td style={{ padding: '6px', color: '#10b981' }}>{pkt.src}</td>
                      <td style={{ padding: '6px', color: '#f59e0b' }}>{pkt.dst}</td>
                      <td style={{ padding: '6px', color: protoColor, fontWeight: 600 }}>{pkt.protocol}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: '#9ca3af' }}>{pkt.length}B</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
            Showing most recent packets. Full analysis available after capture completes.
          </div>
        </div>
      )}

      {/* Show error if capture failed */}
      {captureStatus?.error && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12, borderColor: '#ef4444' }}>
          <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>⚠️ Capture Error</div>
          <div style={{ fontSize: 13, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {captureStatus.error}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
            Common issues:
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>tshark may need sudo permissions</li>
              <li>Network interface might not be accessible</li>
              <li>Firewall could be blocking capture</li>
            </ul>
          </div>
        </div>
      )}

      {/* Packet Analysis Results */}
      {packetData && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>📦 Packet Analysis</h3>
          
          {/* Summary Stats */}
          <div className="ll-card ll-card--purple">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>
                  {packetData.totalPackets}
                </div>
                <div className="ll-muted">Total Packets</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                  {Object.keys(packetData.protocols).length}
                </div>
                <div className="ll-muted">Protocols</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                  {Object.keys(packetData.sources).length}
                </div>
                <div className="ll-muted">Source IPs</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                  {Object.keys(packetData.destinations).length}
                </div>
                <div className="ll-muted">Destination IPs</div>
              </div>
            </div>
          </div>

          {/* Protocol Distribution */}
          <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
            <strong>🔷 Protocol Distribution</strong>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {Object.entries(packetData.protocols)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10)
                .map(([proto, count]) => {
                  const percentage = ((count as number) / packetData.totalPackets * 100).toFixed(1);
                  return (
                    <div key={proto} style={{ 
                      background: '#0b1220', 
                      padding: 8, 
                      borderRadius: 4,
                      borderLeft: '3px solid #7c3aed'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{proto}</span>
                        <span style={{ fontWeight: 600, color: '#7c3aed' }}>{count as number}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{percentage}%</div>
                    </div>
                  );
              })}
            </div>
          </div>

          {/* Source IPs */}
          {Object.keys(packetData.sources).length > 0 && (
            <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
              <strong>📤 Top Source IPs</strong>
              <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
                {Object.entries(packetData.sources)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([ip, count]) => (
                    <div key={ip} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#0b1220',
                      marginBottom: 4,
                      borderRadius: 4,
                      fontSize: 13
                    }}>
                      <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{ip}</span>
                      <span style={{ color: '#9ca3af' }}>{count as number} packets</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Destination IPs */}
          {Object.keys(packetData.destinations).length > 0 && (
            <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
              <strong>📥 Top Destination IPs</strong>
              <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
                {Object.entries(packetData.destinations)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([ip, count]) => (
                    <div key={ip} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#0b1220',
                      marginBottom: 4,
                      borderRadius: 4,
                      fontSize: 13
                    }}>
                      <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{ip}</span>
                      <span style={{ color: '#9ca3af' }}>{count as number} packets</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload Section */}
      <div className="ll-card ll-card--purple" style={{ marginTop: 24 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>📁 Upload PCAP File</h3>
        <div className="ll-row" style={{ alignItems: 'center' }}>
          <input
            className="ll-file"
            type="file"
            accept=".pcap,.pcapng"
            onChange={onSelect}
            ref={inputRef}
            style={{ flex: 1, minWidth: 260 }}
          />
          <button className="ll-button" onClick={analyze} disabled={loading || !file}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {file && (
          <div className="ll-muted" style={{ marginTop: 8 }}>{file.name} ({Math.round(file.size / 1024)} KB)</div>
        )}
      </div>

      {result && (
        <div className="ll-card ll-card--purple" style={{ marginTop: 12 }}>
          <div><strong>Total Packets:</strong> {result.totalPackets}</div>
          <div style={{ marginTop: 8 }}>
            <strong>Protocols</strong>
            <div className="ll-grid" style={{ marginTop: 6 }}>
              {Object.entries(result.protocols || {}).map(([proto, count]) => (
                <div key={proto} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{proto}</span>
                  <span>{count as any}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiresharkAnalyzer;

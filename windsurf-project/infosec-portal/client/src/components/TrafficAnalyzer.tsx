import React, { useState, useEffect, useCallback, useRef } from 'react';
import { wiresharkService, type CaptureStatus, type PacketInfo } from '../services/wiresharkService';

const TrafficAnalyzer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureId, setCaptureId] = useState('');
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [packets, setPackets] = useState<PacketInfo[]>([]);
  const [error, setError] = useState('');
  const packetsRef = useRef<PacketInfo[]>([]);
  const statusRef = useRef<CaptureStatus | null>(null);

  // Handle WebSocket events
  useEffect(() => {
    const handlePackets = (newPackets: PacketInfo[]) => {
      setPackets(prevPackets => {
        // Filter out duplicate packets by number
        const existingNumbers = new Set(prevPackets.map(p => p.number));
        const uniqueNewPackets = newPackets.filter(p => !existingNumbers.has(p.number));
        const updatedPackets = [...prevPackets, ...uniqueNewPackets];
        packetsRef.current = updatedPackets;
        return updatedPackets;
      });
    };

    const handleStatus = (newStatus: CaptureStatus) => {
      setStatus(prevStatus => {
        const updatedStatus = { ...prevStatus, ...newStatus };
        statusRef.current = updatedStatus;
        
        // Update isCapturing based on status
        if (updatedStatus.status === 'completed' || updatedStatus.status === 'error') {
          setIsCapturing(false);
        }
        
        return updatedStatus;
      });
    };

    const handleError = (error: Error) => {
      console.error('WebSocket error:', error);
      setError(error.message);
    };

    // Subscribe to WebSocket events
    wiresharkService.on('packets', handlePackets);
    wiresharkService.on('status', handleStatus);
    wiresharkService.on('error', handleError);

    // Cleanup function
    return () => {
      wiresharkService.off('packets', handlePackets);
      wiresharkService.off('status', handleStatus);
      wiresharkService.off('error', handleError);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (captureId && isCapturing) {
        wiresharkService.stopCapture(captureId).catch(console.error);
      }
    };
  }, [captureId, isCapturing]);

  const startAnalysis = useCallback(async () => {
    if (!url) {
      setError('Please enter a URL to analyze');
      return;
    }

    try {
      setError('');
      setPackets([]);
      setIsCapturing(true);
      
      const result = await wiresharkService.startCapture(url, duration);
      setCaptureId(result.captureId);
      setStatus({ status: 'running', packets: 0 });
      
    } catch (err: any) {
      console.error('Start analysis error:', err);
      setError(err.message || 'Failed to start capture');
      setIsCapturing(false);
    }
  }, [url, duration]);

  const stopAnalysis = useCallback(async () => {
    if (!captureId) return;

    try {
      await wiresharkService.stopCapture(captureId);
      setStatus(prev => prev ? { ...prev, status: 'completed' } : null);
      setIsCapturing(false);
    } catch (err: any) {
      console.error('Stop analysis error:', err);
      setError(err.message || 'Failed to stop capture');
    }
  }, [captureId]);

  // Handle capture status changes
  useEffect(() => {
    if (status?.status === 'error' && status.error) {
      setError(status.error);
      setIsCapturing(false);
    }
  }, [status]);

  const getStatusColor = () => {
    if (!status) return 'bg-gray-100';
    switch (status.status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProtocolColor = (protocol: string) => {
    const protocolLower = protocol.toLowerCase();
    if (protocolLower.includes('tcp')) return 'bg-blue-100 text-blue-800';
    if (protocolLower.includes('udp')) return 'bg-green-100 text-green-800';
    if (protocolLower.includes('http')) return 'bg-purple-100 text-purple-800';
    if (protocolLower.includes('https')) return 'bg-indigo-100 text-indigo-800';
    if (protocolLower.includes('dns')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Website Traffic Analyzer</h2>
        <p className="text-gray-600">Capture and analyze network traffic for any website</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              placeholder="https://example.com"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCapturing}
              required
              pattern="https?://.+"
              title="Please enter a valid URL starting with http:// or https://"
            />
          </div>
          
          <div className="w-full md:w-40">
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              id="duration"
              type="number"
              min="5"
              max="300"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCapturing}
            />
          </div>
          
          <div className="flex items-end space-x-2">
            {!isCapturing ? (
              <button
                onClick={startAnalysis}
                disabled={!url}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Capture
              </button>
            ) : (
              <button
                onClick={stopAnalysis}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Stop Capture
              </button>
            )}
          </div>
        </div>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-md ${getStatusColor().split(' ')[0]}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">
                Status: <span className="capitalize">{status.status}</span>
                {status.status === 'running' && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Live
                  </span>
                )}
              </h3>
              {status.packets !== undefined && (
                <p className="text-sm">Packets captured: {status.packets}</p>
              )}
              {status.elapsed !== undefined && (
                <p className="text-sm">Elapsed: {status.elapsed.toFixed(1)}s</p>
              )}
              {status.file && (
                <p className="text-sm">File: {status.file}</p>
              )}
            </div>
            {status.status === 'running' && (
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                <span className="text-sm">Capturing...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {packets.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Captured Packets</h3>
            <span className="text-sm text-gray-600">Total: {packets.length} packets</span>
          </div>
          <div className="overflow-y-auto max-h-96 border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packets.map((packet) => (
                  <tr key={packet.number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{packet.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{packet.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{packet.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{packet.destination}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getProtocolColor(packet.protocol)}`}>
                        {packet.protocol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{packet.length}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 break-all">{packet.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficAnalyzer;

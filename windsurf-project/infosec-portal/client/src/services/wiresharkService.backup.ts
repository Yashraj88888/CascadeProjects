import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export interface CaptureStatus {
  status: 'running' | 'completed' | 'error';
  packets: number;
  file?: string;
  error?: string;
}

export interface PacketInfo {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
}

export const startCapture = async (url: string, duration: number = 30) => {
  const response = await axios.post(`${API_URL}/api/wireshark/capture/start`, {
    url,
    duration
  });
  return response.data as { captureId: string };
};

export const stopCapture = async (captureId: string) => {
  const response = await axios.post(`${API_URL}/api/wireshark/capture/stop/${captureId}`);
  return response.data as { success: boolean };
};

export const getCaptureStatus = async (captureId: string) => {
  const response = await axios.get(`${API_URL}/api/wireshark/capture/${captureId}/status`);
  return response.data as CaptureStatus;
};

export const getLivePackets = async (captureId: string, limit: number = 20) => {
  const response = await axios.get(`${API_URL}/api/wireshark/capture/${captureId}/live`, {
    params: { limit }
  });
  return response.data as PacketInfo[];
};

export const getDetailedPackets = async (captureId: string, limit: number = 100) => {
  const response = await axios.get(`${API_URL}/api/wireshark/capture/${captureId}/packets`, {
    params: { limit }
  });
  return response.data as PacketInfo[];
};

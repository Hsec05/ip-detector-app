export interface IPAnalysisResult {
  ip: string;
  status: 'safe' | 'suspicious' | 'malicious' | 'error';
  threatLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  threatType: string;
  location: string;
  isp: string;
  confidence: number;
  details: {
    malware: boolean;
    phishing: boolean;
    spam: boolean;
    botnet: boolean;
    proxy: boolean;
    tor: boolean;
  };
  lastSeen: string | null;
  reputation: number;
}

export interface ThreatStats {
  total: number;
  safe: number;
  suspicious: number;
  malicious: number;
  unknown: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}
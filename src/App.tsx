// App.tsx
import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ProcessingStatus } from './components/ProcessingStatus';
import { Shield, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { IPAnalysisResult } from './types';

function App() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<IPAnalysisResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Define your backend API URL
    // For Vite, environment variables are accessed via import.meta.env
    // and should be prefixed with VITE_
    const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        setResults([]);

        try {
            // Read the file content
            const text = await file.text();
            // Regex to match IPv4 addresses
            const ipAddresses = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(line));

            if (ipAddresses.length === 0) {
                throw new Error('No valid IPv4 addresses found in the file. Please ensure IPs are one per line.');
            }

            // Make API call to your backend
            const response = await fetch(`${BACKEND_API_URL}/api/analyze-ips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ipAddresses }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Backend error: ${response.statusText}`);
            }

            const analysisResults: IPAnalysisResult[] = await response.json();
            setResults(analysisResults);

        } catch (err) {
            console.error('File upload and analysis error:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
        } finally {
            setIsProcessing(false);
        }
    };

    const totalIPs = results.length;
    const safeIPs = results.filter(r => r.status === 'safe').length;
    const suspiciousIPs = results.filter(r => r.status === 'suspicious').length;
    const maliciousIPs = results.filter(r => r.status === 'malicious').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 font-inter">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-blue-600 p-4 rounded-full shadow-2xl">
                            <Shield className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                        IP Detector
                    </h1>
                    <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
                        Advanced IP address threat analysis and reputation checking system
                    </p>
                </div>

                {/* Stats Cards */}
                {results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">Total IPs</p>
                                    <p className="text-3xl font-bold text-white">{totalIPs}</p>
                                </div>
                                <Search className="w-8 h-8 text-blue-400" />
                            </div>
                        </div>

                        <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-400/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-200 text-sm font-medium">Safe</p>
                                    <p className="text-3xl font-bold text-green-400">{safeIPs}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                        </div>

                        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-yellow-200 text-sm font-medium">Suspicious</p>
                                    <p className="text-3xl font-bold text-yellow-400">{suspiciousIPs}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                            </div>
                        </div>

                        <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-6 border border-red-400/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-red-200 text-sm font-medium">Malicious</p>
                                    <p className="text-3xl font-bold text-red-400">{maliciousIPs}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                    {!isProcessing && results.length === 0 && !error && (
                        <div className="p-8">
                            <FileUpload onFileUpload={handleFileUpload} />
                        </div>
                    )}

                    {isProcessing && (
                        <div className="p-8">
                            <ProcessingStatus />
                        </div>
                    )}

                    {error && (
                        <div className="p-8">
                            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-6">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
                                    <div>
                                        <h3 className="text-red-400 font-semibold">Error</h3>
                                        <p className="text-red-300">{error}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setResults([]);
                                    }}
                                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {results.length > 0 && !isProcessing && (
                        <ResultsDisplay results={results} onNewFileUpload={handleFileUpload} />
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-12">
                    <p className="text-blue-300 text-sm">
                        Powered by advanced threat intelligence • Real-time IP reputation analysis
                    </p>
                </div>
            </div>
        </div>
    );
}

export default App;

import React, { useState } from 'react';
import {
    Download,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Globe,
    Wifi,
    Clock,
    TrendingUp,
    Upload,
    RefreshCw
} from 'lucide-react';
import { IPAnalysisResult } from '../types';
import { Charts } from './Charts';
import { generatePDFReport } from '../utils/pdfGenerator';

interface ResultsDisplayProps {
    results: IPAnalysisResult[];
    onNewFileUpload?: (file: File) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onNewFileUpload }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const maxPageButtons = 7; // Define how many page buttons to show at once

    const filteredResults = results.filter(result => {
        const matchesSearch = result.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.isp.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.threatType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' || result.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'safe':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'suspicious':
                return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
            case 'malicious':
                return <XCircle className="w-5 h-5 text-red-400" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'safe':
                return 'bg-green-500/20 text-green-400 border-green-400/30';
            case 'suspicious':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
            case 'malicious':
                return 'bg-red-500/20 text-red-400 border-red-400/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
        }
    };

    const getThreatLevelColor = (level: string) => {
        switch (level) {
            case 'low':
                return 'text-green-400';
            case 'medium':
                return 'text-yellow-400';
            case 'high':
                return 'text-orange-400';
            case 'critical':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const handleDownloadReport = async () => {
        try {
            await generatePDFReport(results);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handleDownloadMaliciousReport = async () => {
        try {
            const maliciousResults = results.filter(result => result.status === 'malicious');
            if (maliciousResults.length === 0) {
                console.warn('No malicious IP addresses found to download.');
                return;
            }
            await generatePDFReport(maliciousResults, 'Malicious IPs Report');
        } catch (error) {
            console.error('Error generating malicious IPs PDF:', error);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.name.endsWith('.txt') && onNewFileUpload) {
            onNewFileUpload(file);
        }
    };

    const maliciousCount = results.filter(r => r.status === 'malicious').length;

    const getPageNumbers = () => {
        const pageNumbers = [];
        const halfMaxButtons = Math.floor(maxPageButtons / 2);

        let startPage = Math.max(1, currentPage - halfMaxButtons);
        let endPage = Math.min(totalPages, currentPage + halfMaxButtons);

        if (totalPages > maxPageButtons) {
            if (endPage - startPage + 1 < maxPageButtons) {
                if (currentPage <= halfMaxButtons) {
                    endPage = maxPageButtons;
                } else if (currentPage >= totalPages - halfMaxButtons) {
                    startPage = totalPages - maxPageButtons + 1;
                }
            }
        }

        startPage = Math.max(1, startPage);
        endPage = Math.min(totalPages, endPage);

        if (startPage > 1) {
            pageNumbers.push(1);
            if (startPage > 2) {
                pageNumbers.push('...');
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers.push('...');
            }
            pageNumbers.push(totalPages);
        }

        return pageNumbers;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Analysis Results</h2>
                    <p className="text-blue-200">
                        Found {results.length} IP addresses • {filteredResults.length} matching filters
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Upload New File Button */}
                    <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New File
                        <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>

                    {/* Download Malicious IPs Button */}
                    <button
                        onClick={handleDownloadMaliciousReport}
                        disabled={maliciousCount === 0}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Download Malicious ({maliciousCount})
                    </button>

                    {/* Download Full Report Button */}
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Full Report
                    </button>
                </div>
            </div>

            {/* Charts */}
            <Charts results={results} />

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by IP, location, ISP, or threat type..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1); // Reset to first page on filter change
                        }}
                        // Apply specific styling for the select and its options
                        className="pl-10 pr-8 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none
                                   [&_option]:bg-slate-700 [&_option]:text-white [&_option]:hover:bg-slate-600"
                    >
                        <option value="all">All Status</option>
                        <option value="safe">Safe</option>
                        <option value="suspicious">Suspicious</option>
                        <option value="malicious">Malicious</option>
                    </select>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">IP Address</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Threat Type</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Threat Level</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Location</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">ISP</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Confidence</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-blue-200">Reputation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {paginatedResults.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-blue-300">
                                        No results found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedResults.map((result, index) => (
                                    <tr key={result.ip} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <Globe className="w-4 h-4 text-blue-400 mr-2" />
                                                <span className="font-mono text-white">{result.ip}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {getStatusIcon(result.status)}
                                                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                                                    {result.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-medium">
                                                {result.threatType === 'none' ? 'No Threat' : result.threatType.charAt(0).toUpperCase() + result.threatType.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-medium ${getThreatLevelColor(result.threatLevel)}`}>
                                                {result.threatLevel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <Globe className="w-4 h-4 text-blue-400 mr-2" />
                                                <span className="text-blue-200">{result.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <Wifi className="w-4 h-4 text-blue-400 mr-2" />
                                                <span className="text-blue-200">{result.isp}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <TrendingUp className="w-4 h-4 text-blue-400 mr-2" />
                                                <span className="text-white font-medium">{result.confidence}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-12 bg-gray-600 rounded-full h-2 mr-2">
                                                    <div
                                                        className={`h-2 rounded-full ${
                                                            result.reputation >= 70 ? 'bg-green-500' :
                                                                result.reputation >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${result.reputation}%` }}
                                                    />
                                                </div>
                                                <span className="text-white text-sm">{result.reputation}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-blue-200 text-sm">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredResults.length)} of {filteredResults.length} results
                    </p>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>

                        {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={index} className="px-3 py-2 text-sm text-blue-200">...</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page as number)}
                                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                >
                                    {page}
                                </button>
                            )
                        ))}

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { IPAnalysisResult } from '../types';

// Extend jsPDF for autoTable types
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

// Define an interface for the data object passed to didParseCell hook
interface CellHookData {
    cell: {
        raw: any;
        text: string[];
        styles: {
            font: string;
            fontSize: number;
            cellPadding: number;
            overflow: string;
            textColor: string;
            lineColor: string;
            lineWidth: number;
            fontStyle?: string; // Optional, as it's added conditionally
        };
        // Add other cell properties if needed
    };
    column: {
        index: number;
        // Add other column properties if needed
    };
    row: any; // Simplified, you can define more detailed if needed
    section: 'head' | 'body' | 'foot';
    table: any; // Simplified
    doc: jsPDF;
}


const primaryColor = '#1e3a8a'; // Dark blue for headers
const accentColor = '#3b82f6'; // Blue for highlights
// const secondaryColor = '#60a5fa'; // Unused, can be removed or used

export const generatePDFReport = async (results: IPAnalysisResult[], title: string = 'IP Analysis Report') => {
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
        title: title,
        subject: 'IP Address Threat Analysis',
        author: 'IP Detector App',
    });

    // --- Header ---
    doc.setFontSize(24);
    doc.setTextColor(primaryColor);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor('#4b5563'); // Gray
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

    // --- Summary Statistics ---
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text('Summary', 14, 45);

    const totalIPs = results.length;
    const safeIPs = results.filter(r => r.status === 'safe').length;
    const suspiciousIPs = results.filter(r => r.status === 'suspicious').length;
    const maliciousIPs = results.filter(r => r.status === 'malicious').length;
    const errorIPs = results.filter(r => r.status === 'error').length;


    const summaryData = [
        ['Total IPs', totalIPs.toString()],
        ['Safe IPs', safeIPs.toString()],
        ['Suspicious IPs', suspiciousIPs.toString()],
        ['Malicious IPs', maliciousIPs.toString()],
        ['Error IPs', errorIPs.toString()]
    ];

    doc.autoTable({
        startY: 50,
        head: [['Metric', 'Count']] as string[][], // Explicitly cast to string[][]
        body: summaryData as string[][], // Explicitly cast to string[][]
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 3,
            fillColor: '#f3f4f6', // Light gray background for cells
            textColor: '#374151', // Dark gray text
            lineColor: '#e5e7eb', // Lighter border
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: primaryColor,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        margin: { left: 14, right: 14 }
    });

    // --- Threat Level Distribution ---
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    const threatLevelStartY = (doc as any).autoTable.previous.finalY + 10;
    doc.text('Threat Level Distribution', 14, threatLevelStartY);

    const threatLevelCounts: { [key: string]: number } = {
        'low': 0, 'medium': 0, 'high': 0, 'critical': 0, 'unknown': 0
    };
    results.forEach(r => {
        threatLevelCounts[r.threatLevel] = (threatLevelCounts[r.threatLevel] || 0) + 1;
    });

    const threatLevelData = Object.entries(threatLevelCounts).map(([level, count]) => [
        level.charAt(0).toUpperCase() + level.slice(1),
        count.toString()
    ]) as string[][]; // Explicitly cast to string[][]

    doc.autoTable({
        startY: threatLevelStartY + 5,
        head: [['Threat Level', 'Count']] as string[][], // Explicitly cast to string[][]
        body: threatLevelData,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 3,
            fillColor: '#f3f4f6',
            textColor: '#374151',
            lineColor: '#e5e7eb',
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: primaryColor,
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        margin: { left: 14, right: 14 }
    });

    // --- Detailed IP Analysis Table ---
    doc.addPage(); // Start new page for detailed table
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Detailed IP Analysis', 14, 20);

    const tableHeaders = [
        'IP Address', 'Status', 'Threat Type', 'Threat Level',
        'Location', 'ISP', 'Confidence', 'Reputation'
    ];

    const tableBody = results.map(result => [
        result.ip,
        result.status.toUpperCase(),
        result.threatType === 'none' ? 'No Threat' : result.threatType.charAt(0).toUpperCase() + result.threatType.slice(1),
        result.threatLevel.toUpperCase(),
        result.location,
        result.isp,
        `${result.confidence}%`,
        result.reputation.toString()
    ]) as string[][]; // Explicitly cast to string[][]


    doc.autoTable({
        startY: 30,
        head: [tableHeaders] as string[][], // Explicitly cast to string[][]
        body: tableBody,
        theme: 'striped',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            textColor: '#374151',
            lineColor: '#e5e7eb',
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: accentColor,
            textColor: '#ffffff',
            fontStyle: 'bold',
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: '#f9fafb' // Very light gray for alternate rows
        },
        margin: { left: 10, right: 10 },
        // Add didParseCell hook for conditional styling
        didParseCell: (data: CellHookData) => { // Explicitly type 'data' as CellHookData
            if (data.section === 'body' && data.column.index === 1) { // Column index 1 is 'Status'
                const statusText = data.cell.text[0]; // Get the text from the cell
                if (statusText === 'MALICIOUS') {
                    data.cell.styles.textColor = '#dc2626'; // Red-600
                    data.cell.styles.fontStyle = 'bold'; // Make it bold for emphasis
                } else if (statusText === 'SUSPICIOUS') {
                    data.cell.styles.textColor = '#fbbf24'; // Yellow-400
                } else if (statusText === 'SAFE') {
                    data.cell.styles.textColor = '#22c55e'; // Green-500
                } else if (statusText === 'ERROR') {
                    data.cell.styles.textColor = '#6b7280'; // Gray-500
                }
            }
        }
    });

    // Save the PDF
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

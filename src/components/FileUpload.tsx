import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const txtFile = files.find(file => file.name.endsWith('.txt'));
    
    if (txtFile) {
      setFileName(txtFile.name);
      onFileUpload(txtFile);
    }
  }, [onFileUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const txtFile = files.find(file => file.name.endsWith('.txt'));
    
    if (txtFile) {
      setFileName(txtFile.name);
      onFileUpload(txtFile);
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Upload IP List</h2>
        <p className="text-blue-200 text-lg">
          Upload a .txt file containing IP addresses (one per line) for threat analysis
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          dragActive
            ? 'border-blue-400 bg-blue-500/20 scale-105'
            : 'border-blue-500/50 bg-blue-500/10 hover:border-blue-400 hover:bg-blue-500/20'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".txt"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-blue-600 p-6 rounded-full shadow-lg">
            <Upload className="w-12 h-12 text-white" />
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {dragActive ? 'Drop your file here' : 'Choose file or drag & drop'}
            </h3>
            <p className="text-blue-200 mb-4">
              Supported format: .txt files with IP addresses
            </p>
            
            {fileName && (
              <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-lg">
                <FileText className="w-4 h-4 text-green-400 mr-2" />
                <span className="text-green-400 font-medium">{fileName}</span>
              </div>
            )}
          </div>
          
          <button
            type="button"
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Select File
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-900/30 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-blue-300 font-semibold mb-2">File Format Requirements:</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• One IP address per line</li>
              <li>• IPv4 format only (e.g., 192.168.1.1)</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Plain text (.txt) files only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
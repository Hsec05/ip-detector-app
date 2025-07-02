import React from 'react';
import { Loader2, Shield } from 'lucide-react';

export const ProcessingStatus: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="bg-blue-600 p-6 rounded-full shadow-2xl">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold text-white mb-4">
        Analyzing IP Addresses
      </h3>
      
      <p className="text-blue-200 text-lg mb-6">
        Processing your file and checking each IP against threat databases...
      </p>
      
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 rounded-full h-2 mb-4">
          <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        
        <div className="flex items-center justify-center space-x-4 text-sm text-blue-300">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            Threat Analysis
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
            Reputation Check
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse" />
            Geolocation
          </div>
        </div>
      </div>
      
      <p className="text-blue-300 text-sm mt-6">
        This may take a few moments depending on the number of IP addresses...
      </p>
    </div>
  );
};
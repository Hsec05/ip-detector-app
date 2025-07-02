import React from 'react';
import { IPAnalysisResult } from '../types';
import { BarChart3, PieChart, TrendingUp, Globe } from 'lucide-react';

interface ChartsProps {
  results: IPAnalysisResult[];
}

export const Charts: React.FC<ChartsProps> = ({ results }) => {
  // Calculate statistics
  const statusCounts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const threatLevelCounts = results.reduce((acc, result) => {
    acc[result.threatLevel] = (acc[result.threatLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const threatTypeCounts = results.reduce((acc, result) => {
    const type = result.threatType === 'none' ? 'No Threat' : result.threatType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locationCounts = results.reduce((acc, result) => {
    acc[result.location] = (acc[result.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const renderBarChart = (data: Record<string, number>, title: string, colors: Record<string, string>) => {
    const entries = Object.entries(data).sort(([,a], [,b]) => b - a);
    const maxValue = Math.max(...Object.values(data));

    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center">
              <div className="w-20 text-sm text-blue-200 font-medium">{key}</div>
              <div className="flex-1 ml-4">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-700 rounded-full h-3 mr-3">
                    <div 
                      className={`h-3 rounded-full ${colors[key] || 'bg-blue-500'}`}
                      style={{ width: `${(value / maxValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-sm w-8">{value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = (data: Record<string, number>, title: string, colors: Record<string, string>) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const entries = Object.entries(data);

    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center mb-4">
          <PieChart className="w-5 h-5 text-blue-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
              {entries.reduce((acc, [key, value], index) => {
                const percentage = (value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = acc.angle;
                const endAngle = startAngle + angle;
                
                const x1 = 64 + 50 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 64 + 50 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 64 + 50 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 64 + 50 * Math.sin((endAngle * Math.PI) / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const pathData = [
                  'M', 64, 64,
                  'L', x1, y1,
                  'A', 50, 50, 0, largeArcFlag, 1, x2, y2,
                  'Z'
                ].join(' ');
                
                acc.paths.push(
                  <path
                    key={key}
                    d={pathData}
                    fill={colors[key] || '#3B82F6'}
                    stroke="#1E293B"
                    strokeWidth="1"
                  />
                );
                
                acc.angle = endAngle;
                return acc;
              }, { paths: [] as JSX.Element[], angle: 0 }).paths}
            </svg>
          </div>
        </div>
        
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: colors[key] || '#3B82F6' }}
                  />
                  <span className="text-blue-200 text-sm">{key}</span>
                </div>
                <div className="text-white font-semibold text-sm">
                  {value} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const statusColors = {
    'safe': 'bg-green-500',
    'suspicious': 'bg-yellow-500',
    'malicious': 'bg-red-500',
    'error': 'bg-gray-500'
  };

  const statusPieColors = {
    'safe': '#10B981',
    'suspicious': '#F59E0B',
    'malicious': '#EF4444',
    'error': '#6B7280'
  };

  const threatLevelColors = {
    'low': 'bg-green-500',
    'medium': 'bg-yellow-500',
    'high': 'bg-orange-500',
    'critical': 'bg-red-500',
    'unknown': 'bg-gray-500'
  };

  const threatLevelPieColors = {
    'low': '#10B981',
    'medium': '#F59E0B',
    'high': '#F97316',
    'critical': '#EF4444',
    'unknown': '#6B7280'
  };

  const threatTypeColors = Object.keys(threatTypeCounts).reduce((acc, key) => {
    const colors = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    acc[key] = colors[Object.keys(acc).length % colors.length];
    return acc;
  }, {} as Record<string, string>);

  const threatTypeBarColors = Object.keys(threatTypeCounts).reduce((acc, key) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
    acc[key] = colors[Object.keys(acc).length % colors.length];
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <TrendingUp className="w-6 h-6 text-blue-400 mr-2" />
        <h2 className="text-xl font-bold text-white">Analysis Charts</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        {renderPieChart(statusCounts, 'Status Distribution', statusPieColors)}
        
        {/* Threat Level Distribution */}
        {renderBarChart(threatLevelCounts, 'Threat Level Distribution', threatLevelColors)}
        
        {/* Threat Type Distribution */}
        {renderBarChart(threatTypeCounts, 'Threat Type Distribution', threatTypeBarColors)}
        
        {/* Geographic Distribution */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Geographic Distribution</h3>
          </div>
          
          <div className="space-y-3">
            {Object.entries(locationCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([location, count]) => {
                const percentage = ((count / results.length) * 100).toFixed(1);
                return (
                  <div key={location} className="flex items-center justify-between">
                    <span className="text-blue-200">{location}</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-white text-sm font-semibold w-12">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Radar } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import ChartWrapper from './ChartWrapper';

interface RadarChartProps {
  title?: string;
  subtitle?: string;
  data: ChartData<'radar'>;
  height?: number;
  loading?: boolean;
  options?: ChartOptions<'radar'>;
  labelColors?: string[]; // Keep for backwards compatibility but not used
  className?: string; // For passing className to ChartWrapper
  wrapperPadding?: 'none' | 'sm' | 'md' | 'lg'; // For passing padding to ChartWrapper
}

const RadarChart: React.FC<RadarChartProps> = ({
  title,
  subtitle,
  data,
  height = 300,
  loading = false,
  options = {},
  className,
  wrapperPadding,
}) => {
  // Note: labelColors prop is kept for backwards compatibility but not used
  // Color customization is now done via options.scales.r.pointLabels.color callback

  const defaultOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed.r || 0;
            return `${label}: ${value.toFixed(1)} / 5`;
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          font: {
            size: 10,
          },
          backdropColor: 'transparent',
        },
        pointLabels: {
          display: true,
          font: {
            size: 11,
            weight: 'bold',
          },
          color: '#374151', // Default color (can be overridden via options prop)
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <ChartWrapper title={title} subtitle={subtitle} loading={loading} className={className} padding={wrapperPadding}>
      <div style={{ height: `${height}px`, width: '100%' }}>
        <Radar data={data} options={mergedOptions} />
      </div>
    </ChartWrapper>
  );
};

export default RadarChart;


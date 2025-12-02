import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Card, CardHeader } from '@/components/ui';
import { cn } from '@/utils/cn';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels,
  annotationPlugin
);

export interface ChartWrapperProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  children,
  actions,
  className,
  loading = false,
  error,
  padding,
}) => {
  return (
    <Card variant="elevated" padding={padding} className={cn('', className)}>
      {(title || subtitle || actions) && (
        <CardHeader title={title} subtitle={subtitle} action={actions} />
      )}
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600" />
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full">{children}</div>
      )}
    </Card>
  );
};

// Common chart options
export const getDefaultOptions = (options?: Partial<ChartOptions>): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
    },
    datalabels: {
      display: false,
    },
  },
  ...options,
} as ChartOptions);

export default ChartWrapper;


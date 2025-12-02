import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import Card from '../ui/Card';
import Loading from '../ui/Loading';
import { cn } from '@/utils/cn';

interface ActionAgeChartProps {
  data: ChartData<'bar'>;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  actions?: React.ReactNode;
  isMobile?: boolean;
}

const ActionAgeChart: React.FC<ActionAgeChartProps> = ({
  data,
  loading = false,
  title = 'Finding Actions Age Distribution',
  subtitle,
  height = 350,
  actions,
  isMobile = false,
}) => {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isMobile ? 'y' : 'x', // Horizontal bars on mobile
    plugins: {
      legend: {
        display: false, // Legend removed - colors are self-explanatory
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
        displayColors: true,
        callbacks: {
          label: function(context) {
            const value = isMobile ? (context.parsed as any).x : (context.parsed as any).y;
            return `${context.dataset.label}: ${value} actions`;
          },
          title: function(context) {
            const label = context[0]?.label || '';
            // Add explanation for negative/positive ranges
            if (label.startsWith('-')) {
              return `${label} days (Overdue)`;
            } else if (label === '720+') {
              return `${label} days`;
            } else {
              return `${label} days (Upcoming)`;
            }
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    scales: isMobile ? {
      // Mobile: Horizontal bars - X is value, Y is category
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 9,
          },
          color: '#6B7280',
          padding: 4,
        },
        title: {
          display: true,
          text: 'Number of Actions',
          font: {
            size: 10,
            weight: 'bold',
          },
          color: '#374151',
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 9,
          },
          color: '#374151',
        },
        title: {
          display: false, // Hide on mobile to save space
        },
        border: {
          display: false,
        },
      },
    } : {
      // Desktop: Vertical bars - X is category, Y is value
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#374151',
          maxRotation: 45,
          minRotation: 45,
        },
        title: {
          display: true,
          text: 'Days Until/Past Due Date',
          font: {
            size: 12,
            weight: 'bold',
          },
          color: '#374151',
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
          },
          color: '#6B7280',
          padding: 8,
        },
        title: {
          display: true,
          text: 'Number of Actions',
          font: {
            size: 12,
            weight: 'bold',
          },
          color: '#374151',
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
  };

  return (
    <Card variant="elevated" padding="sm">
      <div className={cn("flex items-center justify-between mb-4", isMobile && "mb-2")}>
        <div>
          <h3 className={cn("font-semibold text-gray-900", isMobile ? "text-sm" : "text-lg")}>{title}</h3>
          {subtitle && <p className={cn("text-gray-600 mt-1", isMobile ? "text-xs" : "text-sm")}>{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>

      <div style={{ height: `${isMobile ? Math.max(300, (data.labels?.length || 0) * 35) : height}px` }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loading size="lg" />
          </div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </Card>
  );
};

export default ActionAgeChart;


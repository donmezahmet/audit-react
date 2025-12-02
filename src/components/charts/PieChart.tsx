import React from 'react';
import { Pie } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import ChartWrapper, { ChartWrapperProps, getDefaultOptions } from './ChartWrapper';

export interface PieChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: ChartData<'pie'>;
  options?: ChartOptions<'pie'>;
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  options,
  height = 300,
  ...wrapperProps
}) => {
  const defaultOptions = getDefaultOptions({
    maintainAspectRatio: false,
    aspectRatio: 1,
    layout: {
      padding: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      datalabels: {
        color: '#fff',
        formatter: (value: number, context: any) => {
          const data = context.dataset.data.filter((v: any) => v !== null) as number[];
          const sum = data.reduce((a, b) => a + b, 0);
          const percentage = ((value / sum) * 100).toFixed(1);
          return `${percentage}%`;
        },
        font: {
          weight: 'bold',
          size: 12,
        },
      },
    },
  });

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  } as ChartOptions<'pie'>;

  return (
    <ChartWrapper {...wrapperProps}>
      <div style={{ height: `${height}px` }}>
        <Pie data={data} options={mergedOptions} />
      </div>
    </ChartWrapper>
  );
};

export default PieChart;


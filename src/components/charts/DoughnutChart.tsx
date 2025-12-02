import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import ChartWrapper, { ChartWrapperProps, getDefaultOptions } from './ChartWrapper';

export interface DoughnutChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: ChartData<'doughnut'>;
  options?: ChartOptions<'doughnut'>;
  height?: number;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  options,
  height = 300,
  ...wrapperProps
}) => {
  const defaultOptions = getDefaultOptions({
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
  }) as any;

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  } as ChartOptions<'doughnut'>;

  return (
    <ChartWrapper {...wrapperProps}>
      <div style={{ height: `${height}px` }}>
        <Doughnut data={data} options={mergedOptions} />
      </div>
    </ChartWrapper>
  );
};

export default DoughnutChart;


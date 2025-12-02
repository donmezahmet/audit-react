import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import ChartWrapper, { ChartWrapperProps, getDefaultOptions } from './ChartWrapper';

export interface BarChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  options,
  height = 300,
  ...wrapperProps
}) => {
  const defaultOptions = getDefaultOptions({
    indexAxis: 'x',
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  });

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  } as ChartOptions<'bar'>;

  return (
    <ChartWrapper {...wrapperProps}>
      <div style={{ height: `${height}px` }}>
        <Bar data={data} options={mergedOptions} />
      </div>
    </ChartWrapper>
  );
};

export default BarChart;


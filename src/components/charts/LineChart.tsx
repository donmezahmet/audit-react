import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import ChartWrapper, { ChartWrapperProps, getDefaultOptions } from './ChartWrapper';

export interface LineChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  options,
  height = 300,
  ...wrapperProps
}) => {
  const defaultOptions = getDefaultOptions({
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4, // Smooth lines
      },
    },
  });

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  } as ChartOptions<'line'>;

  return (
    <ChartWrapper {...wrapperProps}>
      <div style={{ height: `${height}px` }}>
        <Line data={data} options={mergedOptions} />
      </div>
    </ChartWrapper>
  );
};

export default LineChart;


import React from 'react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { DoughnutChart, BarChart } from '@/components/charts';
import { ChartData } from 'chart.js';

const RiskManagementPage: React.FC = () => {
  // Sample data
  const riskDistributionData: ChartData<'doughnut'> = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [12, 35, 58, 23],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const riskTrendsData: ChartData<'bar'> = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Identified Risks',
        data: [45, 52, 48, 38],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'Mitigated Risks',
        data: [38, 45, 42, 35],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
    ],
  };

  const topRisks = [
    { id: 1, title: 'Cybersecurity Threats', level: 'critical', category: 'Technology', probability: 'High', impact: 'High' },
    { id: 2, title: 'Regulatory Compliance', level: 'high', category: 'Compliance', probability: 'Medium', impact: 'High' },
    { id: 3, title: 'Data Privacy Breach', level: 'critical', category: 'Security', probability: 'Medium', impact: 'High' },
    { id: 4, title: 'Operational Inefficiency', level: 'medium', category: 'Operations', probability: 'High', impact: 'Medium' },
    { id: 5, title: 'Third-Party Dependencies', level: 'high', category: 'Vendor', probability: 'Medium', impact: 'High' },
  ];

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage organizational risks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[19.2px]">
        <Card variant="elevated">
          <CardHeader title="Total Risks" subtitle="Currently tracked" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-purple-600">128</p>
            <p className="text-sm text-gray-500 mt-2">Across all categories</p>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader title="Critical Risks" subtitle="Immediate attention" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-red-600">12</p>
            <p className="text-sm text-gray-500 mt-2">Requires action</p>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader title="Mitigated" subtitle="This quarter" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-green-600">45</p>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-green-600 font-medium">↑ 15%</span> from last quarter
            </p>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader title="Risk Score" subtitle="Overall assessment" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-yellow-600">6.8</p>
            <p className="text-sm text-gray-500 mt-2">Out of 10</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[19.2px]">
        <DoughnutChart
          title="Risk Distribution by Severity"
          subtitle="Current risk portfolio"
          data={riskDistributionData}
          height={350}
        />

        <BarChart
          title="Risk Trends"
          subtitle="Quarterly comparison"
          data={riskTrendsData}
          height={350}
        />
      </div>

      {/* Top Risks Table */}
      <Card variant="elevated">
        <CardHeader
          title="Top Risks"
          subtitle="Highest priority items requiring attention"
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Risk</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Level</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Probability</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Impact</th>
              </tr>
            </thead>
            <tbody>
              {topRisks.map((risk) => (
                <tr key={risk.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{risk.title}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{risk.category}</td>
                  <td className="py-4 px-4">
                    <Badge variant={getRiskBadgeVariant(risk.level)}>
                      {risk.level}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{risk.probability}</td>
                  <td className="py-4 px-4 text-gray-600">{risk.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RiskManagementPage;


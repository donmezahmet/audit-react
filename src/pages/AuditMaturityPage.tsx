import React from 'react';
import { Card, CardHeader, Loading } from '@/components/ui';
import { useMatScores } from '@/hooks';
import { jiraService } from '@/services/jira.service';
import { useQuery } from '@tanstack/react-query';

const AuditMaturityPage: React.FC = () => {
  const { data: matScores, isLoading: loadingMAT } = useMatScores();
  const { data: googleSheetData, isLoading: loadingSheet } = useQuery({
    queryKey: ['google-sheet-data'],
    queryFn: () => jiraService.getGoogleSheetData(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900">Audit Maturity Assessment</h1>
          <p className="text-gray-600 mt-1">Track audit maturity scores and progress</p>
        </div>
      </div>

      {/* MAT Scores from Jira */}
      <Card variant="elevated">
        <CardHeader title="Maturity Scores" subtitle="From Jira MAT project" />
        {loadingMAT ? (
          <div className="h-64 flex items-center justify-center">
            <Loading size="xl" text="Loading MAT scores..." />
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Object</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {matScores?.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-900">{item.object}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-semibold ${
                        item.score >= 4 ? 'bg-green-100 text-green-800' :
                        item.score >= 3 ? 'bg-blue-100 text-blue-800' :
                        item.score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.score}/5
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Google Sheets Data */}
      <Card variant="elevated">
        <CardHeader title="Additional Maturity Data" subtitle="From Google Sheets" />
        {loadingSheet ? (
          <div className="h-64 flex items-center justify-center">
            <Loading size="xl" text="Loading Google Sheets data..." />
          </div>
        ) : googleSheetData && googleSheetData.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {Object.keys(googleSheetData[0]).map((header) => (
                    <th key={header} className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {googleSheetData.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="py-4 px-4 text-gray-900">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No Google Sheets data available</p>
        )}
      </Card>

      {/* Maturity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[19.2px]">
        <Card variant="elevated">
          <CardHeader title="Average Score" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-purple-600">
              {matScores && matScores.length > 0
                ? (matScores.reduce((sum: number, item: any) => sum + item.score, 0) / matScores.length).toFixed(2)
                : '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Out of 5.00</p>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader title="High Performers" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-green-600">
              {matScores?.filter((item: any) => item.score >= 4).length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Scores 4.0+</p>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader title="Needs Improvement" />
          <div className="mt-4">
            <p className="text-4xl font-bold text-red-600">
              {matScores?.filter((item: any) => item.score < 3).length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Scores below 3.0</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuditMaturityPage;


import { cn } from '@/utils/cn';

interface RiskBreakdown {
  [riskLevel: string]: {
    total: number;
    completed: number;
  };
}

interface AuditRiskData {
  auditYear: string;
  auditName: string;
  total: number;
  completed: number;
  completionRate: number;
  riskBreakdown: RiskBreakdown;
}

interface ActionsByAuditRiskTableProps {
  data: AuditRiskData[];
  isLoading?: boolean;
  onCellClick?: (auditYear: string, auditName: string, riskLevel?: string) => void;
  mode?: 'actions' | 'findings';
}

const riskOrder = ['Critical', 'High', 'Medium', 'Low'];

const getRiskBadgeColor = (riskLevel: string) => {
  const colors: Record<string, string> = {
    Critical: 'bg-gray-900',  // Siyah
    High: 'bg-red-500',       // Kırmızı
    Medium: 'bg-orange-500',  // Turuncu
    Low: 'bg-yellow-500',     // Sarı
    Unassigned: 'bg-gray-400',
  };
  return colors[riskLevel] || colors.Unassigned;
};

export function ActionsByAuditRiskTable({ data, isLoading, onCellClick }: ActionsByAuditRiskTableProps) {

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-auto" style={{ maxHeight: '350px' }}>
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-[9.6px] py-[6.4px] text-left text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Year
              </th>
              <th className="px-[9.6px] py-[6.4px] text-left text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Audit Name
              </th>
              <th className="px-[9.6px] py-[6.4px] text-center text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Critical
              </th>
              <th className="px-[9.6px] py-[6.4px] text-center text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                High
              </th>
              <th className="px-[9.6px] py-[6.4px] text-center text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Medium
              </th>
              <th className="px-[9.6px] py-[6.4px] text-center text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Low
              </th>
              <th className="px-[9.6px] py-[6.4px] text-center text-[9.6px] font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const rowKey = `${item.auditYear}-${item.auditName}-${index}`;
              
              // Ensure riskBreakdown exists, default to empty object if missing
              const riskBreakdown = item.riskBreakdown || {};

              return (
                <tr key={rowKey} className="hover:bg-gray-50 transition-colors">
                  <td className="px-[9.6px] py-[6.4px] whitespace-nowrap font-medium text-gray-900">
                    {item.auditYear || '-'}
                  </td>
                  <td className="px-[9.6px] py-[6.4px] text-gray-900">
                    <div className="max-w-xs truncate" title={item.auditName}>
                      {item.auditName || '-'}
                    </div>
                  </td>
                  {/* Risk Level Columns */}
                  {riskOrder.map((riskLevel) => {
                    const risk = riskBreakdown[riskLevel];
                    const total = risk?.total || 0;
                    const completed = risk?.completed || 0;

                    return (
                      <td key={riskLevel} className="px-[9.6px] py-[6.4px] text-center">
                        {total > 0 ? (
                          <button
                            onClick={() => onCellClick?.(item.auditYear, item.auditName, riskLevel)}
                            className="inline-flex items-center gap-[3.2px] hover:bg-purple-50 hover:underline px-[6.4px] py-[3.2px] rounded transition-all cursor-pointer group"
                            title={`Click to view ${total} ${riskLevel} actions`}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', getRiskBadgeColor(riskLevel))} />
                            <span className="font-medium text-gray-900 group-hover:text-purple-600">{total}</span>
                            <span className="text-[9.6px] text-gray-500">({completed})</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-[9.6px] py-[6.4px] text-center">
                    <button
                      onClick={() => onCellClick?.(item.auditYear, item.auditName)}
                      className="font-semibold text-gray-900 hover:text-purple-600 hover:underline transition-all cursor-pointer px-3 py-1 hover:bg-purple-50 rounded"
                      title={`Click to view all ${item.total} actions`}
                    >
                      {item.total}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact Table View */}
      <div className="md:hidden overflow-x-auto -mx-6 px-6">
        <div className="min-w-full inline-block">
          <table className="min-w-full text-[10px]">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-1.5 pr-1.5 font-semibold text-gray-700 sticky left-0 bg-white z-10 min-w-[120px]">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-normal text-gray-500">Year</span>
                    <span className="text-[10px]">Audit Name</span>
                  </div>
                </th>
                <th className="text-center py-1.5 px-0.5 font-semibold text-gray-900 bg-gray-900 text-white min-w-[36px] text-[9px]">
                  C
                </th>
                <th className="text-center py-1.5 px-0.5 font-semibold text-red-600 bg-red-50 min-w-[36px] text-[9px]">
                  H
                </th>
                <th className="text-center py-1.5 px-0.5 font-semibold text-orange-600 bg-orange-50 min-w-[36px] text-[9px]">
                  M
                </th>
                <th className="text-center py-1.5 px-0.5 font-semibold text-yellow-600 bg-yellow-50 min-w-[36px] text-[9px]">
                  L
                </th>
                <th className="text-center py-1.5 px-0.5 font-semibold text-gray-700 bg-gray-100 min-w-[36px] text-[9px]">
                  T
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => {
                const rowKey = `mobile-${item.auditYear}-${item.auditName}-${index}`;
                
                // Ensure riskBreakdown exists, default to empty object if missing
                const riskBreakdown = item.riskBreakdown || {};

                return (
                  <tr key={rowKey} className="hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 pr-1.5 sticky left-0 bg-white z-10 border-r border-gray-200 min-w-[120px]">
                      <button
                        onClick={() => onCellClick?.(item.auditYear, item.auditName)}
                        className="text-left hover:text-purple-600 transition-colors w-full"
                      >
                        <div className="text-[8px] text-gray-500 mb-0.5">{item.auditYear || '-'}</div>
                        <div className="text-[10px] font-semibold text-gray-900 line-clamp-2 leading-tight" title={item.auditName}>
                          {item.auditName || '-'}
                        </div>
                      </button>
                    </td>
                    {riskOrder.map((riskLevel) => {
                      const risk = riskBreakdown[riskLevel];
                      const total = risk?.total || 0;
                      const completed = risk?.completed || 0;

                      return (
                        <td key={riskLevel} className="text-center py-1.5 px-0.5">
                          {total > 0 ? (
                            <button
                              onClick={() => onCellClick?.(item.auditYear, item.auditName, riskLevel)}
                              className="flex flex-col items-center gap-0.5 hover:bg-purple-50 rounded px-0.5 py-0.5 transition-all w-full group"
                            >
                              <span className={cn('w-1 h-1 rounded-full', getRiskBadgeColor(riskLevel))} />
                              <span className="text-[10px] font-bold text-gray-900 group-hover:text-purple-600">{total}</span>
                              <span className="text-[7px] text-gray-500 leading-none">({completed})</span>
                            </button>
                          ) : (
                            <span className="text-gray-300 text-[9px]">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-1.5 px-0.5">
                      <button
                        onClick={() => onCellClick?.(item.auditYear, item.auditName)}
                        className="text-[10px] font-bold text-gray-900 hover:text-purple-600 transition-colors"
                      >
                        {item.total}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}



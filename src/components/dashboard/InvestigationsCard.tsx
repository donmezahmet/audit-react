import React, { useMemo } from 'react';
import { Card, CardHeader, Loading } from '@/components/ui';
import { cn } from '@/utils/cn';

// --- Types ---

interface Investigation {
    year: string;
    count: number;
    yearPerAuditor?: string;
    [key: string]: any; // For other properties that might exist
}

interface InvestigationsCardProps {
    investigations: Investigation[] | null | undefined;
    loading: boolean;
}

interface YearData {
    total: number;
    perAuditor: string;
}

interface YearConfig {
    bgColor: string;
    textColor: string;
    borderColor: string;
    shape: string;
    layout: 'vertical' | 'horizontal';
}

// --- Constants ---

const YEAR_CONFIGS: Record<string, YearConfig> = {
    '2025': {
        bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200',
        shape: 'rounded-3xl', // Fully rounded
        layout: 'vertical'
    },
    '2024': {
        bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        shape: 'rounded-lg', // Sharp corners
        layout: 'vertical'
    },
    '2023': {
        bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
        textColor: 'text-violet-700',
        borderColor: 'border-violet-200',
        shape: 'rounded-2xl', // Medium rounded
        layout: 'vertical'
    },
    '2022': {
        bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        shape: 'rounded-xl', // Slightly rounded
        layout: 'vertical'
    },
    '2021': {
        bgColor: 'bg-gradient-to-br from-neutral-50 to-neutral-100/50',
        textColor: 'text-neutral-700',
        borderColor: 'border-neutral-200',
        shape: 'rounded-xl', // Same as others
        layout: 'vertical'
    },
};

const DEFAULT_CONFIG: YearConfig = {
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    shape: 'rounded-xl',
    layout: 'vertical'
};

// --- Component ---

export const InvestigationsCard: React.FC<InvestigationsCardProps> = ({
    investigations,
    loading
}) => {

    // Transform data: Group by year and sum counts
    const yearDataList = useMemo(() => {
        if (!investigations || !Array.isArray(investigations)) return [];

        const yearData: Record<string, YearData> = {};

        investigations.forEach((inv) => {
            if (inv.year && inv.year !== 'Unknown' && inv.year !== '2020') {
                if (!yearData[inv.year]) {
                    yearData[inv.year] = { total: 0, perAuditor: inv.yearPerAuditor || '0.00' };
                }

                const yearEntry = yearData[inv.year];
                if (yearEntry) {
                    yearEntry.total += (inv.count || 1);

                    // Use the yearPerAuditor from backend (already calculated)
                    if (inv.yearPerAuditor) {
                        yearEntry.perAuditor = inv.yearPerAuditor;
                    }
                }
            }
        });

        // Convert to array and sort by year (newest first)
        return Object.entries(yearData)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 5);
    }, [investigations]);

    return (
        <Card variant="elevated" className="bg-white border border-gray-200 shadow-sm">
            <CardHeader
                title="Investigations by Year"
                className="border-b border-gray-200 pb-3"
            />
            <div className="mt-4 grid grid-cols-6 gap-2">
                {loading ? (
                    <div className="col-span-6 flex justify-center py-8">
                        <Loading size="lg" />
                    </div>
                ) : yearDataList.length > 0 ? (
                    yearDataList.map(([year, data], idx) => {
                        const config = YEAR_CONFIGS[year] || DEFAULT_CONFIG;

                        return (
                            <div
                                key={year}
                                className={cn(
                                    "relative p-2.5 overflow-hidden",
                                    "hover:shadow-lg hover:scale-[1.02]",
                                    "transition-all duration-300 ease-out",
                                    "group cursor-pointer",
                                    "border-2",
                                    config.bgColor,
                                    config.borderColor,
                                    config.shape,
                                    idx < 2 ? 'col-span-3' : 'col-span-2'
                                )}
                            >
                                {/* Subtle pattern overlay */}
                                <div className={cn(
                                    "absolute inset-0 opacity-[0.03]",
                                    idx % 2 === 0
                                        ? "bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[length:16px_16px]"
                                        : "bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:12px_12px]"
                                )} />

                                {/* Content */}
                                <div className={cn(
                                    "relative z-10 flex flex-col h-full",
                                    config.layout === 'vertical' ? 'items-center justify-center' : 'items-start justify-between'
                                )}>
                                    {/* Year badge */}
                                    <div className={cn(
                                        "flex items-center gap-1 mb-1.5",
                                        config.textColor
                                    )}>
                                        <div className={cn(
                                            "w-4 h-4 rounded flex items-center justify-center",
                                            "bg-white/60 backdrop-blur-sm",
                                            "border border-current/20"
                                        )}>
                                            <svg
                                                className="w-2.5 h-2.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <p className="text-[10px] font-semibold tracking-wide uppercase">
                                            {year}
                                        </p>
                                    </div>

                                    {/* Count */}
                                    <div className="mb-1.5">
                                        <p className={cn(
                                            "text-2xl font-bold",
                                            config.textColor,
                                            "group-hover:scale-110 transition-transform duration-300"
                                        )}>
                                            {data.total}
                                        </p>
                                    </div>

                                    {/* Per auditor metric */}
                                    <div className={cn(
                                        "flex items-center gap-0.5",
                                        config.textColor
                                    )}>
                                        <svg
                                            className={cn("w-2.5 h-2.5 opacity-70")}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                        <p className={cn("text-[9px] font-medium opacity-80 whitespace-nowrap")}>
                                            {data.perAuditor} per auditor
                                        </p>
                                    </div>
                                </div>

                                {/* Decorative element based on shape */}
                                {config.shape === 'rounded-lg' && (
                                    <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 transform rotate-45 translate-x-3 -translate-y-3" />
                                )}
                                {config.shape === 'rounded-3xl' && (
                                    <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/20 rounded-full blur-xl" />
                                )}
                                {config.shape === 'rounded-xl' && (
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-lg" />
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-6 text-center text-gray-500 py-8">
                        No data available
                    </div>
                )}
            </div>
        </Card>
    );
};

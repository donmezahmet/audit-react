import React from 'react';
import { Construction } from 'lucide-react';

const AuditUniversePage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4">
            <div className="text-center space-y-6 max-w-2xl">
                {/* Animated Icon Container */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full blur-2xl opacity-30 animate-pulse" />
                    <div className="relative bg-white rounded-full p-8 shadow-2xl border border-purple-100">
                        <Construction className="w-24 h-24 text-purple-600 animate-bounce" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent">
                        Audit Universe
                    </h1>
                    <div className="h-1 w-32 mx-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
                </div>

                {/* Subtitle */}
                <p className="text-[16px] font-medium text-gray-600">
                    Under Construction
                </p>

                {/* Description */}
                <p className="text-base text-gray-500 leading-relaxed max-w-lg mx-auto">
                    We're building something amazing! This page is currently under development
                    and will be available soon.
                </p>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-full font-medium shadow-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full absolute" />
                    <span className="ml-1">Coming Soon</span>
                </div>

                {/* Additional Info */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-400">
                        Admin Access Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuditUniversePage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-white mb-4">404</h1>
        <h2 className="text-[24px] font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-purple-200 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-[12.8px] justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="text-white border-white hover:bg-white/10"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="primary"
            className="bg-white text-purple-600 hover:bg-gray-100"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;


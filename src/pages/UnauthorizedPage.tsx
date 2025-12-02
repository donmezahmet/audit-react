import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center" variant="elevated">
        <svg
          className="mx-auto h-16 w-16 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h1 className="mt-4 text-[16px] font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8 flex gap-[12.8px] justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={() => navigate('/')} variant="primary">
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;


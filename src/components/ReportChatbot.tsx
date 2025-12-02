import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth.store';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  filters?: {
    status?: string;
    auditName?: string;
    auditLead?: string;
    riskLevel?: string;
    responsibleEmail?: string;
    cLevel?: string;
    auditYear?: string;
  };
}

export interface ReportChatbotProps {
  onGenerateReport: (message: string) => Promise<{
    success: boolean;
    filters?: ChatMessage['filters'];
    message?: string;
    error?: string;
  }>;
  isExporting?: boolean;
}

const ReportChatbot: React.FC<ReportChatbotProps> = ({
  onGenerateReport,
  isExporting = false,
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Hello! You can write your request in natural language to create a report. Example: "Export all actions with Open status"',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user initials from name
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      const first = nameParts[0]?.[0];
      const last = nameParts[nameParts.length - 1]?.[0];
      if (first && last) {
        return (first + last).toUpperCase();
      }
    }
    if (nameParts[0]?.[0]) {
      return nameParts[0][0].toUpperCase();
    }
    return 'U';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing || isExporting) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const result = await onGenerateReport(userMessage.content);

      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.message || 'Generating report...',
          timestamp: new Date(),
          filters: result.filters,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'error',
          content: result.error || 'Your request could not be understood. Please try again with more details.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: 'An error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <>
      <style>{`
        @keyframes robot-blink {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0.1; }
        }
        @keyframes robot-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes robot-bounce {
         0%, 100% { transform: translateY(0); }
         50% { transform: translateY(-8px); }
        }
        @keyframes robot-bounce-slow {
         0%, 100% { transform: translateY(0); }
         50% { transform: translateY(-3px); }
        }
        .robot-eye-blink {
          animation: robot-blink 3s infinite;
        }
        .robot-antenna-wiggle {
          animation: robot-wiggle 2s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .robot-bounce {
          animation: robot-bounce 1.5s ease-in-out infinite;
        }
        .robot-bounce-slow {
          animation: robot-bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
      {/* Floating Button with Animated Robot */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open report chatbot"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-xl transform transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/50 robot-bounce">
              {/* Animated Robot Icon */}
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 bg-white rounded"></div>
                <div className="absolute top-1 left-1.5 flex gap-0.5">
                  <div className="w-1 h-1 bg-purple-600 rounded-full robot-eye-blink"></div>
                  <div className="w-1 h-1 bg-purple-600 rounded-full robot-eye-blink" style={{ animationDelay: '0.15s' }}></div>
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-purple-600 rounded-full"></div>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-white rounded-t-full robot-antenna-wiggle"></div>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Compact Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden backdrop-blur-xl">
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center robot-bounce-slow">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 bg-white rounded"></div>
                  {/* Blinking eyes */}
                  <div className="absolute top-0.5 left-1 flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-600 rounded-full robot-eye-blink"></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full robot-eye-blink" style={{ animationDelay: '0.1s' }}></div>
                  </div>
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-purple-600 rounded-full"></div>
                  {/* Wiggling antenna */}
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-white rounded-t-full robot-antenna-wiggle"></div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base">AuditBot</h3>
                <p className="text-xs text-white/80">AI assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
              aria-label="Close chatbot"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type !== 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mt-0.5 hover:scale-110 transition-transform duration-200 robot-bounce-slow">
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 bg-white/90 rounded"></div>
                      {/* Animated blinking eyes */}
                      <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                        <div className="w-0.5 h-0.5 bg-purple-600 rounded-full robot-eye-blink"></div>
                        <div className="w-0.5 h-0.5 bg-purple-600 rounded-full robot-eye-blink" style={{ animationDelay: '0.15s' }}></div>
                      </div>
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-0.5 bg-purple-600 rounded-full"></div>
                      {/* Small antenna for message robots */}
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-white rounded-t-full robot-antenna-wiggle"></div>
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-xl px-3 py-2 text-sm',
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm'
                      : message.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                      : message.type === 'system'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200 rounded-bl-sm'
                      : message.content.includes('Found **') || message.content.includes('** action')
                      ? 'bg-gradient-to-br from-purple-50 to-pink-50 text-gray-800 border-2 border-purple-200 rounded-bl-sm shadow-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  )}
                >
                  {message.content.includes('**') && (message.content.includes('I found') || message.content.includes('There') || message.content.includes('Found') || message.content.includes('counted')) ? (
                    <div className="leading-relaxed">
                      <p className="leading-relaxed" dangerouslySetInnerHTML={{ 
                        __html: message.content.replace(/\*\*(.*?)\*\*/g, '<span class="text-2xl font-bold text-purple-600 inline-block mx-1">$1</span>')
                      }}></p>
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                      __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-purple-700">$1</strong>')
                    }}></p>
                  )}
                  {/* Don't show filter badges - keep it simple and AI-like */}
                  <p className="text-xs opacity-50 mt-1.5">
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mt-0.5 shadow-sm hover:scale-110 transition-transform duration-200">
                    <span className="text-xs font-bold text-white">
                      {getUserInitials()}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {(isProcessing || isExporting) && (
              <div className="flex justify-start gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-bounce" style={{ animationDuration: '1s' }}>
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 bg-white/90 rounded"></div>
                    {/* Fast blinking eyes when processing */}
                    <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                      <div className="w-0.5 h-0.5 bg-purple-600 rounded-full animate-pulse" style={{ animationDuration: '0.5s' }}></div>
                      <div className="w-0.5 h-0.5 bg-purple-600 rounded-full animate-pulse" style={{ animationDuration: '0.5s', animationDelay: '0.15s' }}></div>
                    </div>
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-0.5 bg-purple-600 rounded-full"></div>
                    {/* Wiggling antenna when processing */}
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-white rounded-t-full robot-antenna-wiggle" style={{ animationDuration: '0.8s' }}></div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {isExporting ? 'Generating...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compact Input */}
          <div className="border-t border-gray-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AuditBot..."
                disabled={isProcessing || isExporting}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isProcessing || isExporting}
                className={cn(
                  'rounded-lg p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                  inputValue.trim() && !isProcessing && !isExporting
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 active:scale-95 shadow-md'
                    : 'bg-gray-200 text-gray-400'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportChatbot;

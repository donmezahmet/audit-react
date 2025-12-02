import React, { useRef } from 'react';
import { cn } from '@/utils/cn';

interface ResizableTableHeaderProps {
  columnKey: string;
  width?: number;
  onResizeStart: (columnKey: string, event: React.MouseEvent) => void;
  isResizing?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onDragStart?: (columnKey: string) => void;
  onDragOver?: (e: React.DragEvent, columnKey: string) => void;
  onDrop?: (columnKey: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

const ResizableTableHeader: React.FC<ResizableTableHeaderProps> = ({
  columnKey,
  width,
  onResizeStart,
  isResizing = false,
  children,
  className = '',
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
}) => {
  const isResizingRef = useRef(false);

  const handleClick = () => {
    // Only trigger onClick if we're not resizing
    if (!isResizingRef.current && onClick) {
      onClick();
    }
    // Reset flag after a delay
    setTimeout(() => {
      isResizingRef.current = false;
    }, 100);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizingRef.current = true;
    onResizeStart(columnKey, e);
  };

  return (
    <th
      className={cn(
        'relative group text-left',
        className,
        isDragging && 'opacity-50',
        isDragOver && 'bg-purple-100 border-l-4 border-purple-500'
      )}
      style={{ width: width ? `${width}px` : undefined }}
      onClick={handleClick}
      draggable={true}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.(columnKey);
      }}
      onDragOver={(e) => onDragOver?.(e, columnKey)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(columnKey);
      }}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle Icon */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
        </svg>
      </div>

      <div className={cn(
        className.includes('text-center') 
          ? 'flex items-center justify-center' 
          : 'pl-8 text-left'
      )}>
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize group',
          'hover:bg-purple-500 hover:opacity-70',
          isResizing && 'bg-purple-500 opacity-100',
          'transition-colors'
        )}
        onMouseDown={handleResizeStart}
        title="Drag to resize column"
      >
        <div className="absolute top-0 right-0 w-4 h-full -mr-1.5" />
      </div>
      
      {/* Resize Indicator Icon */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
    </th>
  );
};

export default ResizableTableHeader;




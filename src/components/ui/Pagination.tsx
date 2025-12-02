import React from 'react';
import Button from './Button';
import { cn } from '@/utils/cn';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  className?: string;
  isMobile?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = '',
  isMobile = false,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
    }
    // Reset to page 1 when changing items per page
    onPageChange(1);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-4",
      isMobile ? "flex-col gap-2" : "justify-between",
      className
    )}>
      {/* Items per page selector */}
      {onItemsPerPageChange && (
        <div className={cn("flex items-center gap-2", isMobile && "w-full justify-center")}>
          <span className={cn("text-gray-600", isMobile ? "text-[8px]" : "text-xs")}>Show:</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className={cn(
              "border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
              isMobile ? "px-[6.4px] py-[1.6px] text-[8px]" : "px-[9.6px] py-[4.8px] text-xs"
            )}
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className={cn("text-gray-600", isMobile ? "text-[8px]" : "text-xs")}>per page</span>
        </div>
      )}

      {/* Page info */}
      <div className={cn(isMobile ? "w-full text-center" : "flex-1 text-center")}>
        <span className={cn("font-medium text-gray-700", isMobile ? "text-[8px]" : "text-xs")}>
          {isMobile ? `${startItem}-${endItem} of ${totalItems}` : `Showing ${startItem} to ${endItem} of ${totalItems} items`}
        </span>
      </div>

      {/* Navigation buttons */}
      <div className={cn("flex items-center gap-2", isMobile && "w-full justify-center")}>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className={cn(isMobile ? "!px-1.5 !py-0.5 !text-[9px] min-w-[50px]" : "min-w-[80px]")}
        >
          <svg className={cn(isMobile ? "w-2 h-2 mr-0.5" : "w-[12.8px] h-[12.8px] mr-[3.2px]")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isMobile ? "Prev" : "Previous"}
        </Button>

        <span className={cn("text-gray-600 px-1", isMobile ? "text-[7.2px]" : "text-xs")}>
          {isMobile ? `${currentPage}/${totalPages}` : `Page ${currentPage} of ${totalPages}`}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(isMobile ? "!px-1.5 !py-0.5 !text-[9px] min-w-[50px]" : "min-w-[80px]")}
        >
          Next
          <svg className={cn(isMobile ? "w-2 h-2 ml-0.5" : "w-[12.8px] h-[12.8px] ml-[3.2px]")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

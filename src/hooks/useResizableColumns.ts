import { useState, useEffect, useCallback, RefObject } from 'react';

interface ColumnWidths {
  [key: string]: number;
}

export function useResizableColumns(
  initialWidthsOrTableRef: RefObject<HTMLTableElement> | ColumnWidths,
  initialWidths?: ColumnWidths,
  storageKey: string = 'table-column-widths'
) {
  // Support both old and new API
  const widths = initialWidths || (initialWidthsOrTableRef as ColumnWidths);
  
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored !== 'undefined') {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // Failed to parse stored column widths - using defaults
        }
      }
    }
    return widths;
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Save to localStorage whenever widths change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey]);

  const handleMouseDown = useCallback((columnKey: string, event: React.MouseEvent) => {
    event.preventDefault();
    setResizing(columnKey);
    setStartX(event.clientX);
    setStartWidth(columnWidths[columnKey] || 150);
  }, [columnWidths]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!resizing) return;

    const diff = event.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Minimum 50px width

    setColumnWidths(prev => ({
      ...prev,
      [resizing]: newWidth,
    }));
  }, [resizing, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setResizing(null);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  const resetWidths = useCallback(() => {
    setColumnWidths(widths);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [widths, storageKey]);

  return {
    columnWidths,
    resizing,
    handleMouseDown,
    resetWidths,
  };
}


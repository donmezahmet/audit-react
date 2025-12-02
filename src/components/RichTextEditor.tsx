import React, { useMemo, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  fullWidth?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  label,
  required,
  error,
  fullWidth = false,
  className,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const linkButtonClickedRef = useRef(false);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
      ],
    },
  }), []);

  // Close tooltip when disabled or component unmounts
  useEffect(() => {
    const closeTooltip = () => {
      // Close any open Quill tooltips
      const tooltips = document.querySelectorAll('.ql-tooltip');
      tooltips.forEach((tooltip) => {
        const element = tooltip as HTMLElement;
        if (element.style.display !== 'none') {
          element.style.display = 'none';
          element.classList.remove('ql-editing');
        }
      });
    };

    if (disabled) {
      closeTooltip();
    }

    // Also close on component mount/unmount to prevent stale tooltips
    return () => {
      closeTooltip();
    };
  }, [disabled]);

  // Make links clickable and show URL on hover
  useEffect(() => {
    if (!quillRef.current) return;

    const quill = quillRef.current.getEditor();
    const editorElement = quill.root;

    // Create custom tooltip element
    let tooltipElement: HTMLDivElement | null = null;

    const createTooltip = (): HTMLDivElement => {
      if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'link-hover-tooltip';
        tooltipElement.style.cssText = `
          position: absolute;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          pointer-events: none;
          z-index: 10001;
          white-space: nowrap;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;
        document.body.appendChild(tooltipElement);
      }
      return tooltipElement;
    };

    const showTooltip = (link: HTMLAnchorElement) => {
      const tooltip = createTooltip();
      const href = link.getAttribute('href') || '';
      tooltip.textContent = href;

      const rect = link.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
      tooltip.style.display = 'block';
    };

    const hideTooltip = () => {
      if (tooltipElement) {
        tooltipElement.style.display = 'none';
      }
    };

    // Add click handlers and hover tooltips to links
    const updateLinks = () => {
      const links = editorElement.querySelectorAll('a');
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          // Add title for native browser tooltip as fallback
          link.setAttribute('title', href);
          // Make sure link opens in new tab
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          // Ensure click works
          link.style.pointerEvents = 'auto';
          link.style.cursor = 'pointer';

          // Remove existing listeners to avoid duplicates
          const newLink = link.cloneNode(true) as HTMLAnchorElement;
          link.parentNode?.replaceChild(newLink, link);

          // Add hover listeners
          newLink.addEventListener('mouseenter', () => showTooltip(newLink));
          newLink.addEventListener('mouseleave', hideTooltip);
        }
      });
    };

    // Update links when value changes
    updateLinks();

    // Observe for link changes
    const observer = new MutationObserver(updateLinks);
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    return () => {
      observer.disconnect();
      if (tooltipElement) {
        document.body.removeChild(tooltipElement);
        tooltipElement = null;
      }
    };
  }, [value, disabled]);

  // Prevent tooltip from auto-opening on focus/edit
  useEffect(() => {
    if (!quillRef.current) return;

    const quill = quillRef.current.getEditor();
    const editorElement = quill.root;
    const toolbarElement = quill.getModule('toolbar')?.container;

    // Close tooltip only if link button wasn't clicked
    const closeTooltip = () => {
      if (linkButtonClickedRef.current) return; // Don't close if link button was clicked

      const tooltips = document.querySelectorAll('.ql-tooltip');
      tooltips.forEach((tooltip) => {
        const element = tooltip as HTMLElement;
        // Only close if it's not in editing mode (editing mode means link button was clicked)
        if (!element.classList.contains('ql-editing')) {
          element.style.display = 'none';
        }
      });
    };

    // Close tooltip on focus, but only if link button wasn't recently clicked
    const handleFocus = (e: FocusEvent) => {
      // Don't close if clicking on tooltip or link button
      const target = e.target as HTMLElement;
      if (target?.closest('.ql-tooltip') || target?.closest('.ql-link')) {
        return;
      }
      if (!linkButtonClickedRef.current) {
        setTimeout(closeTooltip, 50);
      }
    };

    // Monitor for tooltip appearance and close it if not from link button
    let observerTimeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      // Debounce observer calls
      clearTimeout(observerTimeout);
      observerTimeout = setTimeout(() => {
        // Don't interfere if link button was clicked - let tooltip stay open
        if (linkButtonClickedRef.current) return;

        const tooltips = document.querySelectorAll('.ql-tooltip');
        tooltips.forEach((tooltip) => {
          const element = tooltip as HTMLElement;
          // Only close if tooltip is showing but NOT in editing mode
          // If it's in editing mode, it means user clicked link button intentionally
          // If it's not in editing mode, it's probably auto-opened (unwanted)
          if (element.style.display !== 'none' && !element.classList.contains('ql-editing')) {
            // Check if it has an input field - if yes, it's a link tooltip that should stay
            const hasInput = element.querySelector('input[type="text"]');
            if (!hasInput) {
              element.style.display = 'none';
            }
          }
        });
      }, 200);
    });

    // Observe the editor container for tooltip changes
    if (editorElement) {
      observer.observe(editorElement.parentElement || document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });

      editorElement.addEventListener('focus', handleFocus);
      // Don't close on click - let ReactQuill handle it
    }

    // Handle link button click and adjust tooltip position
    if (toolbarElement) {
      const linkButton = toolbarElement.querySelector('.ql-link');
      if (linkButton) {
        const handleLinkClick = (e: MouseEvent) => {
          e.stopPropagation();
          linkButtonClickedRef.current = true;

          // Allow tooltip to show when link button is clicked
          setTimeout(() => {
            const tooltips = document.querySelectorAll('.ql-tooltip');
            tooltips.forEach((tooltip) => {
              const element = tooltip as HTMLElement;
              if (element.classList.contains('ql-editing')) {
                element.style.display = 'flex';

                // Adjust position to stay within viewport
                const rect = element.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // If tooltip goes off right edge, move it left
                if (rect.right > viewportWidth) {
                  element.style.left = `${viewportWidth - rect.width - 10}px`;
                  element.style.right = 'auto';
                }

                // If tooltip goes off left edge, move it right
                if (rect.left < 0) {
                  element.style.left = '10px';
                  element.style.right = 'auto';
                }

                // If tooltip goes off bottom edge, move it up
                if (rect.bottom > viewportHeight) {
                  element.style.top = `${viewportHeight - rect.height - 10}px`;
                  element.style.bottom = 'auto';
                }
              }
            });
          }, 100);

          // Keep flag true for longer to prevent premature closing
          setTimeout(() => {
            linkButtonClickedRef.current = false;
          }, 5000); // 5 seconds should be enough for user to interact
        };
        linkButton.addEventListener('click', handleLinkClick);

        return () => {
          linkButton.removeEventListener('click', handleLinkClick);
          clearTimeout(observerTimeout);
        };
      }
    }

    // Initial close only on mount
    setTimeout(closeTooltip, 100);

    return () => {
      observer.disconnect();
      clearTimeout(observerTimeout);
      if (editorElement) {
        editorElement.removeEventListener('focus', handleFocus);
      }
    };
  }, [value, disabled]);

  // Close tooltip when save button is clicked or value changes (after save)
  useEffect(() => {
    const handleTooltipSave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only close if clicking the save button inside tooltip
      if (target && (target.classList.contains('ql-action') || target.closest('.ql-action'))) {
        setTimeout(() => {
          const tooltips = document.querySelectorAll('.ql-tooltip');
          tooltips.forEach((tooltip) => {
            const element = tooltip as HTMLElement;
            element.style.display = 'none';
            element.classList.remove('ql-editing');
          });
          linkButtonClickedRef.current = false;
        }, 150);
      }
    };

    document.addEventListener('click', handleTooltipSave, true);

    // Close when value changes (after save completes) - but only if tooltip was in editing mode
    const timer = setTimeout(() => {
      // Only close if link button wasn't recently clicked (user might still be editing)
      if (!linkButtonClickedRef.current) {
        const tooltips = document.querySelectorAll('.ql-tooltip');
        tooltips.forEach((tooltip) => {
          const element = tooltip as HTMLElement;
          // Only close if it's been a while since link button was clicked
          if (element.classList.contains('ql-editing')) {
            // Check if tooltip is still visible and user might have finished
            const input = element.querySelector('input[type="text"]') as HTMLInputElement;
            if (input && document.activeElement !== input) {
              // Input is not focused, probably user finished editing
              element.style.display = 'none';
              element.classList.remove('ql-editing');
            }
          }
        });
      }
    }, 500);

    return () => {
      document.removeEventListener('click', handleTooltipSave, true);
      clearTimeout(timer);
    };
  }, [value]);

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link',
  ];

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className || ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={disabled ? 'opacity-50' : ''}>
        <div className={`rich-text-editor-wrapper ${disabled ? 'editor-disabled' : ''}`}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            readOnly={disabled}
            style={{
              height: `${rows * 1.5}rem`,
            }}
            className="bg-white"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      <style>{`
        .rich-text-editor-wrapper {
          margin-bottom: 0 !important;
          position: relative;
          display: block;
          height: auto !important;
        }
        .rich-text-editor-wrapper > div {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          height: auto !important;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          border: 1px solid #d1d5db;
          border-bottom: none;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border: 1px solid #d1d5db;
          border-top: none;
          position: relative;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          height: auto !important;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${rows * 1.5}rem;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          ${className?.includes('text-[10px]') ? 'font-size: 0.625rem !important;' : ''}
          ${className?.includes('text-[11px]') ? 'font-size: 0.6875rem !important;' : ''}
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-formats {
          ${className?.includes('text-[10px]') ? 'font-size: 0.625rem !important;' : ''}
          ${className?.includes('text-[11px]') ? 'font-size: 0.6875rem !important;' : ''}
        }
        .rich-text-editor-wrapper .ql-toolbar button {
          ${className?.includes('text-[10px]') ? 'padding: 0.25rem !important; width: 1.25rem !important; height: 1.25rem !important;' : ''}
          ${className?.includes('text-[11px]') ? 'padding: 0.25rem !important; width: 1.5rem !important; height: 1.5rem !important;' : ''}
        }
        .rich-text-editor-wrapper .ql-snow {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar {
          margin-bottom: 0 !important;
        }
        .rich-text-editor-wrapper .ql-snow.ql-container,
        .rich-text-editor-wrapper .ql-snow .ql-container {
          margin-bottom: 0 !important;
        }
        .rich-text-editor-wrapper .ql-tooltip {
          position: absolute !important;
          z-index: 10000 !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border-radius: 0.5rem !important;
          border: 1px solid #e5e7eb !important;
          background: white !important;
          padding: 0.5rem !important;
          min-width: 280px !important;
          max-width: 90vw !important;
          display: none !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 0.5rem !important;
          white-space: nowrap !important;
        }
        .rich-text-editor-wrapper .ql-tooltip.ql-editing {
          position: absolute !important;
          z-index: 10000 !important;
          display: flex !important;
          /* Ensure tooltip stays within viewport */
          left: auto !important;
          right: auto !important;
          transform: none !important;
        }
        /* Adjust tooltip position to stay within viewport */
        .rich-text-editor-wrapper .ql-tooltip.ql-editing[data-position] {
          /* ReactQuill will set data-position, we'll respect it but ensure it's visible */
        }
        .rich-text-editor-wrapper .ql-tooltip::before {
          display: block !important;
        }
        .rich-text-editor-wrapper .ql-tooltip input[type=text] {
          border: 1px solid #d1d5db !important;
          border-radius: 0.375rem !important;
          padding: 0.375rem 0.5rem !important;
          font-size: 0.875rem !important;
          width: 180px !important;
          max-width: calc(90vw - 200px) !important;
          transition: border-color 0.2s !important;
        }
        .rich-text-editor-wrapper .ql-tooltip input[type=text]:focus {
          outline: none !important;
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-action,
        .rich-text-editor-wrapper .ql-tooltip a.ql-remove {
          cursor: pointer !important;
          border-radius: 0.375rem !important;
          padding: 0.25rem 0.5rem !important;
          font-weight: 500 !important;
          font-size: 0.75rem !important;
          transition: all 0.2s !important;
          text-decoration: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          line-height: 1.5 !important;
          min-width: auto !important;
          width: auto !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-action {
          background: #8b5cf6 !important;
          color: white !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-action:hover {
          background: #7c3aed !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-remove {
          background: #f3f4f6 !important;
          color: #374151 !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-remove:hover {
          background: #e5e7eb !important;
        }
        /* Hide default Quill icons and show text */
        .rich-text-editor-wrapper .ql-tooltip a.ql-action::before {
          display: none !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-action::after {
          content: 'Save' !important;
          display: block !important;
          text-align: center !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: inherit !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-remove::before {
          display: none !important;
        }
        .rich-text-editor-wrapper .ql-tooltip a.ql-remove::after {
          content: 'Cancel' !important;
          display: block !important;
          text-align: center !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: inherit !important;
        }
        /* Style hyperlinks in editor - make them clickable even in read-only mode */
        .rich-text-editor-wrapper .ql-editor a {
          color: #2563eb !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        .rich-text-editor-wrapper .ql-editor a:hover {
          color: #1d4ed8 !important;
          text-decoration: underline !important;
        }
        .rich-text-editor-wrapper .ql-editor a:visited {
          color: #7c3aed !important;
        }
        /* Ensure links are clickable even when editor is disabled */
        .rich-text-editor-wrapper .ql-editor.ql-disabled a,
        .rich-text-editor-wrapper .ql-container.ql-disabled .ql-editor a {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        /* Disable toolbar when editor is disabled, but keep links clickable */
        .rich-text-editor-wrapper.editor-disabled .ql-toolbar {
          pointer-events: none !important;
          opacity: 0.5 !important;
        }
        .rich-text-editor-wrapper.editor-disabled .ql-toolbar * {
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;


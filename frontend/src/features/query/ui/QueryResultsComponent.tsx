import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogItem } from '../../../entity/query';
import { getUserTimeFormatWithMs } from '../../../shared/time';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';

const STORAGE_KEY = 'tracebull-message-length';

/**
 * Get default message length based on screen width
 */
const getDefaultMessageLength = (): number => {
  if (typeof window === 'undefined') {
    return 135; // Default for SSR
  }

  const screenWidth = window.innerWidth;

  if (screenWidth <= 1440) {
    return 135;
  } else if (screenWidth <= 1920) {
    return 100;
  } else {
    // 2K and above
    return 145;
  }
};

/**
 * Get stored message length from localStorage, fallback to screen-based default
 */
const getStoredMessageLength = (): number => {
  if (typeof window === 'undefined') {
    return getDefaultMessageLength();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to read message length from localStorage:', error);
  }

  return getDefaultMessageLength();
};

interface Props {
  queryResults: LogItem[];
  totalResults: number;
  hasExecuted: boolean;
  isExecuting: boolean;
  hasMoreResults: boolean;
  onLoadMore: () => void;
  onAddFieldToQuery?: (fieldName: string, fieldValue: string) => void;
}

/**
 * QueryResultsComponent - Displays log query results with infinite scroll
 *
 * Features:
 * - Results displayed in flex-based layout with fixed column widths
 * - Color-coded log levels with badges
 * - Infinite scroll loading when user scrolls to bottom
 * - Loading states during query execution
 * - Empty state when no results found
 * - Click to expand/collapse field details
 */
export const QueryResultsComponent = ({
  queryResults,
  totalResults,
  hasExecuted,
  isExecuting,
  hasMoreResults,
  onLoadMore,
  onAddFieldToQuery,
}: Props): React.JSX.Element | null => {
  // States
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [messageLength, setMessageLength] = useState<number>(getStoredMessageLength());
  const [showFields, setShowFields] = useState<boolean>(true);

  // Get user's time format preference with milliseconds
  const timeFormat = useMemo(() => getUserTimeFormatWithMs(), []);

  // Refs
  const isLoadingMore = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Functions
  const handleScroll = useCallback(() => {
    if (isLoadingMore.current || !hasMoreResults || isExecuting) {
      return;
    }

    // Find the scrollable parent container
    const scrollContainer = containerRef.current?.closest('.overflow-y-auto') as HTMLElement;
    if (!scrollContainer) {
      return;
    }

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const scrollThreshold = 100; // Load more when 100px from bottom

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      isLoadingMore.current = true;
      onLoadMore();
    }
  }, [hasMoreResults, isExecuting, onLoadMore]);

  const renderLogLevel = (level: string) => {
    const colors = {
      ERROR: 'bg-red-100 text-red-800 border-red-200',
      WARN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      INFO: 'bg-blue-100 text-blue-800 border-blue-200',
      DEBUG: 'bg-muted text-foreground border-border',
      TRACE: 'bg-purple-100 text-purple-800 border-purple-200',
      FATAL: 'bg-red-200 text-red-900 border-red-300',
      CRITICAL: 'bg-red-200 text-red-900 border-red-300',
    };

    const colorClass = colors[level as keyof typeof colors] || colors.INFO;

    return (
      <span className={`inline-block rounded border px-1 py-0.5 text-xs font-medium ${colorClass}`}>
        {level}
      </span>
    );
  };

  const truncateText = (
    text: string,
    maxLength: number,
  ): { text: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { text, isTruncated: false };
    }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true };
  };

  const formatFieldValue = (value: string): { formatted: string; isJson: boolean } => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(value);
      // If successful, format with proper indentation
      return {
        formatted: JSON.stringify(parsed, null, 2),
        isJson: true,
      };
    } catch {
      // Not JSON, return as is
      return {
        formatted: value,
        isJson: false,
      };
    }
  };

  const toggleRowExpansion = (logId: string) => {
    // Check if user has selected text - if so, don't toggle the row
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(logId)) {
      newExpandedRows.delete(logId);
    } else {
      newExpandedRows.add(logId);
    }
    setExpandedRows(newExpandedRows);
  };

  const renderCustomFields = (log: LogItem, isExpanded: boolean, maxLength: number) => {
    const fieldKeys = Object.keys(log.fields || {});

    if (fieldKeys.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    // Create a string representation of all fields
    const fieldsString = fieldKeys.map((key) => `${key}: ${log.fields?.[key]}`).join(', ');

    const { text: displayText, isTruncated } = isExpanded
      ? { text: fieldsString, isTruncated: false }
      : truncateText(fieldsString, maxLength);

    if (fieldsString.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    return (
      <div className="space-y-1">
        {isExpanded ? (
          fieldKeys.map((key) => {
            const { formatted, isJson } = formatFieldValue(log.fields?.[key] || '');

            return (
              <div
                className="flex !font-mono text-xs break-all"
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div className="cursor-pointer rounded px-1 hover:bg-emerald-200">
                      <span className="!font-mono font-medium text-muted-foreground">{key}:</span>{' '}
                      <span
                        className={`!font-mono text-muted-foreground ${
                          isJson || formatted.includes(' ') ? 'whitespace-pre-wrap' : ''
                        }`}
                      >
                        {formatted}
                      </span>
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Add Field to Query</AlertDialogTitle>
                      <AlertDialogDescription>
                        Add &quot;{key}&quot; with value &quot;{log.fields?.[key]}&quot; to the
                        query?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          if (onAddFieldToQuery) {
                            onAddFieldToQuery(key, log.fields?.[key] || '');
                          }
                        }}
                      >
                        Yes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })
        ) : (
          <div className="text-xs">
            <span className="!font-mono break-all text-muted-foreground">{displayText}</span>
            {isTruncated && (
              <span className="ml-1 cursor-pointer text-primary hover:text-primary/80">
                (expand)
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // useEffect hooks
  useEffect(() => {
    if (!isExecuting) {
      isLoadingMore.current = false;
    }
  }, [isExecuting]);

  useEffect(() => {
    const scrollContainer = containerRef.current?.closest('.overflow-y-auto') as HTMLElement;
    if (!scrollContainer) {
      return;
    }

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Save message length to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, messageLength.toString());
      } catch (error) {
        console.warn('Failed to save message length to localStorage:', error);
      }
    }
  }, [messageLength]);

  if (!hasExecuted) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">Query Results</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="messageLength" className="text-xs font-normal text-muted-foreground">
                Message length:
              </label>

              <input
                id="messageLength"
                type="number"
                value={messageLength}
                onChange={(e) => setMessageLength(Math.max(1, parseInt(e.target.value)))}
                className="w-16 rounded border border-input px-1 py-0.5 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                min="1"
                max="1000"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showFields"
                checked={showFields}
                onCheckedChange={(checked) => setShowFields(checked === true)}
                className="text-xs"
              />
              <label htmlFor="showFields" className="text-xs font-normal text-muted-foreground">
                Show fields
              </label>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              {isExecuting && queryResults.length === 0 ? (
                <Spinner size="sm" />
              ) : (
                `${queryResults.length.toLocaleString()}${totalResults > queryResults.length ? `+ of ${totalResults.toLocaleString()}` : ''} results${queryResults.length > 0 ? ' loaded' : ' found'}`
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        {isExecuting && queryResults.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
            <span className="ml-2 text-sm">Executing query...</span>
          </div>
        ) : queryResults.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
            No logs found matching your query.
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header Row */}
            <div className="flex gap-2 border-b border-border pb-1 text-xs font-medium text-foreground">
              <div style={{ width: '150px' }}>Timestamp</div>
              <div style={{ width: '85px' }}>Level</div>
              <div className={showFields ? 'flex-1' : 'flex-[2]'}>Message</div>
              {showFields && (
                <>
                  <div style={{ width: '10px' }} />
                  <div className="flex-1">Fields</div>
                </>
              )}
            </div>

            {/* Results Rows */}
            {queryResults.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              const { text: displayMessage, isTruncated: messageIsTruncated } = isExpanded
                ? { text: log.message, isTruncated: false }
                : truncateText(log.message, messageLength);

              return (
                <div
                  key={log.id}
                  className="flex cursor-pointer items-start gap-2 border-b border-border py-1 !font-mono text-xs hover:bg-accent"
                  onClick={() => toggleRowExpansion(log.id)}
                >
                  <div
                    style={{ width: '150px', lineHeight: 1.1 }}
                    className="text-xs text-muted-foreground"
                  >
                    <div className="!font-mono" style={{ fontSize: '12px' }}>
                      {dayjs(log.timestamp).format(timeFormat.format)}
                    </div>
                    <div className="!font-mono text-muted-foreground" style={{ fontSize: '10px' }}>
                      {dayjs(log.timestamp).fromNow()}
                    </div>
                  </div>

                  <div className="!font-mono" style={{ width: '85px' }}>
                    {renderLogLevel(log.level)}
                  </div>

                  <div
                    className={`${showFields ? 'flex-1' : 'flex-[2]'} !font-mono text-xs break-all text-foreground ${
                      isExpanded && displayMessage.includes(' ') ? 'whitespace-pre-wrap' : ''
                    }`}
                  >
                    {displayMessage}
                    {messageIsTruncated && !isExpanded && (
                      <span className="ml-1 text-primary hover:text-primary/80">(expand)</span>
                    )}
                  </div>

                  {showFields && (
                    <>
                      <div style={{ width: '10px' }} />
                      <div className="flex-1">
                        {renderCustomFields(log, isExpanded, messageLength)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Loading indicator for infinite scroll */}
            {isExecuting && queryResults.length > 0 && (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
                <span className="ml-2 text-xs text-muted-foreground">Loading more results...</span>
              </div>
            )}

            {/* End of results indicator */}
            {!hasMoreResults && queryResults.length > 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                All {totalResults.toLocaleString()} results loaded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

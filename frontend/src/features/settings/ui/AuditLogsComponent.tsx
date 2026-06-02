import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { auditLogApi } from '../../../entity/audit-logs/api/auditLogApi';
import type { AuditLog } from '../../../entity/audit-logs/model/AuditLog';
import type { GetAuditLogsRequest } from '../../../entity/audit-logs/model/GetAuditLogsRequest';
import { toastMessage } from '../../../shared/lib/toastMessage';
import { getUserShortTimeFormat } from '../../../shared/time';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function AuditLogsComponent({ scrollContainerRef: externalScrollRef }: Props) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const pageSize = 50;

  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = externalScrollRef || internalScrollRef;
  const loadingRef = useRef(false);

  useEffect(() => {
    loadAuditLogs(true);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore || loadingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadAuditLogs(false);
    }
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const loadAuditLogs = async (isInitialLoad = false) => {
    if (!isInitialLoad && loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    if (isInitialLoad) {
      setIsLoading(true);
      setAuditLogs([]);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const offset = isInitialLoad ? 0 : auditLogs.length;
      const request: GetAuditLogsRequest = {
        limit: pageSize,
        offset: offset,
      };

      const response = await auditLogApi.getGlobalAuditLogs(request);

      if (isInitialLoad) {
        setAuditLogs(response.auditLogs);
      } else {
        setAuditLogs((prev) => {
          const existingIds = new Set(prev.map((log) => log.id));
          const newLogs = response.auditLogs.filter((log) => !existingIds.has(log.id));
          return [...prev, ...newLogs];
        });
      }

      setTotal(response.total);
      setHasMore(response.auditLogs.length === pageSize);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audit logs';
      toastMessage.error(errorMessage);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const renderUser = (record: AuditLog) => {
    if (!record.userEmail && !record.userName) {
      return (
        <span className="inline-block rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          System
        </span>
      );
    }

    const displayText = record.userName
      ? `${record.userName} (${record.userEmail})`
      : record.userEmail;

    return (
      <span className="inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
        {displayText}
      </span>
    );
  };

  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Audit Logs</h2>
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            `${auditLogs.length} of ${total} logs`
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[200px]">Project</TableHead>
                <TableHead className="w-[250px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((record) => {
                const date = dayjs(record.createdAt);
                const tf = getUserShortTimeFormat();
                return (
                  <TableRow key={record.id}>
                    <TableCell>{renderUser(record)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">{record.message}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          record.projectName
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {record.projectName || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                       <span className="text-xs text-foreground">
                        {`${date.format(tf.format)} (${date.fromNow()})`}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Spinner />
              <span className="ml-2 text-sm text-muted-foreground">Loading more logs...</span>
            </div>
          )}

          {!hasMore && auditLogs.length > 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              All logs loaded ({total} total)
            </div>
          )}
        </>
      )}
    </div>
  );
}

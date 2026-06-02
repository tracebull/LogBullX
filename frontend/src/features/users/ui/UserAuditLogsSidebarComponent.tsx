import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Spinner } from '../../../components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';

import { auditLogApi } from '../../../entity/audit-logs/api/auditLogApi';
import type { AuditLog } from '../../../entity/audit-logs/model/AuditLog';
import type { GetAuditLogsRequest } from '../../../entity/audit-logs/model/GetAuditLogsRequest';
import type { UserProfile } from '../../../entity/users/model/UserProfile';
import { toastMessage } from '../../../shared/lib/toastMessage';
import { getUserShortTimeFormat } from '../../../shared/time';

interface Props {
  user: UserProfile;
}

export function UserAuditLogsSidebarComponent({ user }: Props) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const pageSize = 50;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadAuditLogs(true);
  }, [user.id]);

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

      const response = await auditLogApi.getUserAuditLogs(user.id, request);

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

  const formatCreatedAt = (createdAt: string) => {
    const date = dayjs(createdAt);
    const timeFormat = getUserShortTimeFormat();
    return `${date.format(timeFormat.format)} (${date.fromNow()})`;
  };

  return (
    <div className="h-full">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
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
            <Table className="mb-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[200px]">Project</TableHead>
                  <TableHead className="w-[200px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-xs text-foreground">{log.message}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          log.projectName ? 'bg-blue-100 text-blue-800' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {log.projectName || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">
                        {formatCreatedAt(log.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-muted-foreground">Loading more logs...</span>
              </div>
            )}

            {!hasMore && auditLogs.length > 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                All logs loaded ({total} total)
              </div>
            )}

            {!isLoading && auditLogs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No audit logs found for this user.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

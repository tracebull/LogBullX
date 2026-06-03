import { toastMessage } from '@/shared/lib/toastMessage';
import { getUserShortTimeFormat } from '@/shared/time';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { AuditLog } from '../../../entity/audit-logs/model/AuditLog';
import { projectApi } from '../../../entity/projects/api/projectApi';

interface Props {
  projectId: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ProjectAuditLogsComponent({
  projectId,
  scrollContainerRef: externalScrollRef,
}: Props) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const pageSize = 50;

  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = externalScrollRef || internalScrollRef;
  const loadingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore || loadingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadAuditLogs(false);
    }
  }, [isLoadingMore, hasMore]);

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
      const params = {
        limit: pageSize,
        offset: offset,
      };

      const response = await projectApi.getProjectAuditLogs(projectId, params);

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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load project audit logs';
      toastMessage.error(errorMessage);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadAuditLogs(true);
    }
  }, [projectId]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (!projectId) {
    return null;
  }

  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex items-center justify-end">
        <div className="text-muted-foreground text-sm">
          {isLoading ? <Spinner size="sm" /> : `${auditLogs.length} of ${total} logs`}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center">
          No audit logs found for this project.
        </div>
      ) : (
        <>
          <Table className="mb-4">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[250px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {!record.userEmail && !record.userName ? (
                      <span className="bg-muted text-muted-foreground inline-block rounded-full px-1.5 py-0.5 text-xs font-medium">
                        System
                      </span>
                    ) : (
                      <span className="bg-secondary text-secondary-foreground inline-block rounded-full px-1.5 py-0.5 text-xs font-medium">
                        {record.userName
                          ? `${record.userName} (${record.userEmail})`
                          : record.userEmail}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground text-xs">{record.message}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">
                      {(() => {
                        const date = dayjs(record.createdAt);
                        const timeFormat = getUserShortTimeFormat();
                        return `${date.format(timeFormat.format)} (${date.fromNow()})`;
                      })()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
              <span className="text-muted-foreground ml-2 text-sm">Loading more logs...</span>
            </div>
          )}

          {!hasMore && auditLogs.length > 0 && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              All logs loaded ({total} total)
            </div>
          )}
        </>
      )}
    </div>
  );
}

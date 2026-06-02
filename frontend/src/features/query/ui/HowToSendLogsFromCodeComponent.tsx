import { Copy, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { type Project, projectApi } from '../../../entity/projects';
import { copyToClipboard } from '../../../shared/lib';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { CodeUsageComponent } from './CodeUsageComponent';

interface Props {
  projectId: string;
  onClose: () => void;
}

export const HowToSendLogsFromCodeComponent = ({
  projectId,
  onClose,
}: Props): React.JSX.Element => {
  // States
  const [project, setProject] = useState<Project | null>(null);
  const [copyingStates, setCopyingStates] = useState<Record<string, boolean>>({});

  // Functions
  const loadInfo = async () => {
    const project = await projectApi.getProject(projectId);
    setProject(project);
  };

  const handleCopyToClipboard = async (text: string) => {
    const type = text === window.origin ? 'logbull-url' : 'project-id';
    setCopyingStates((prev) => ({ ...prev, [type]: true }));

    try {
      await copyToClipboard(text);
    } finally {
      setTimeout(() => {
        setCopyingStates((prev) => ({ ...prev, [type]: false }));
      }, 300);
    }
  };

  // useEffect hooks
  useEffect(() => {
    loadInfo();
  }, [projectId]);

  // Calculated values
  const baseUrl = window.origin;

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>How to send logs from code?</DialogTitle>
        </DialogHeader>

        {!project ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              {project.isApiKeyRequired && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '8px 12px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#856404' }}>
                    📝 API Key Required: This project requires an X-API-Key header. Create an API key
                    in your project settings.
                  </strong>
                </div>
              )}

              {project.isFilterByDomain && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '8px 12px',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#0c5460' }}>
                    🌐 Domain Filtering: This project filters by domain. Allowed domains:{' '}
                    {project.allowedDomains.join(', ')}
                  </strong>
                </div>
              )}

              {project.isFilterByIp && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '8px 12px',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#0c5460' }}>
                    🔒 IP Filtering: This project filters by IP address. Allowed IPs:{' '}
                    {project.allowedIps.join(', ')}
                  </strong>
                </div>
              )}
            </div>

            <div className="mb-4 flex">
              <div className="mr-5 w-80">
                <div className="mb-1">
                  <span className="text-xs font-medium text-muted-foreground">LogBull URL:</span>
                </div>
                <div className="flex items-center justify-between rounded border border-border bg-muted px-3 py-1.5">
                  <span className="truncate !font-mono text-xs text-foreground">{baseUrl}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 size-5 min-w-5 p-0.5 text-muted-foreground"
                    onClick={() => handleCopyToClipboard(baseUrl)}
                    disabled={copyingStates['logbull-url']}
                  >
                    {copyingStates['logbull-url'] ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="w-80">
                <div className="mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Project ID:</span>
                </div>
                <div className="flex items-center justify-between rounded border border-border bg-muted px-3 py-1.5">
                  <span className="truncate !font-mono text-xs text-foreground">{projectId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 size-5 min-w-5 p-0.5 text-muted-foreground"
                    onClick={() => handleCopyToClipboard(projectId)}
                    disabled={copyingStates['project-id']}
                  >
                    {copyingStates['project-id'] ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <CodeUsageComponent
              logbullHost={baseUrl}
              logbullProjectId={projectId}
              logbullApiKey="YOUR_API_KEY_HERE"
              isLogBullApiKeyRequired={project.isApiKeyRequired}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

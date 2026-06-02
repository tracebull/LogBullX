import { useCallback, useState } from 'react';

import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Spinner } from '../../../components/ui/spinner';

import type { BulkInviteResponse } from '../../../entity/users';
import { userApi } from '../../../entity/users';
import { toastMessage } from '../../../shared/lib/toastMessage';

interface Props {
  open: boolean;
  onClose: () => void;
  onInviteComplete: () => void;
}

const MAX_EMAILS = 500;

export function BulkInviteComponent({ open, onClose, onInviteComplete }: Props) {
  const [textValue, setTextValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkInviteResponse | null>(null);

  const parseEmails = useCallback((): string[] => {
    const lines = textValue
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes('@'));

    const unique = [...new Set(lines)];
    return unique.slice(0, MAX_EMAILS);
  }, [textValue]);

  const handleInvite = async () => {
    const emails = parseEmails();
    if (emails.length === 0) {
      toastMessage.warning('No valid emails found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userApi.bulkInviteUsers({ emails });
      setResults(response);
      toastMessage.success(`Invited ${response.invited.length} user(s)`);
      onInviteComplete();
    } catch (e) {
      toastMessage.error((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTextValue('');
    setResults(null);
    onClose();
  };

  const emailCount = parseEmails().length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Invite Users</DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="space-y-3">
            {results.invited.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-emerald-600">
                  Invited ({results.invited.length})
                </div>
                <div className="max-h-40 overflow-y-auto rounded bg-emerald-50 p-2 text-sm">
                  {results.invited.map((r) => (
                    <div key={r.email}>{r.email}</div>
                  ))}
                </div>
              </div>
            )}
            {results.skipped.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-semibold text-yellow-600">
                  Skipped — already exists ({results.skipped.length})
                </div>
                <div className="max-h-40 overflow-y-auto rounded bg-yellow-50 p-2 text-sm">
                  {results.skipped.map((r) => (
                    <div key={r.email}>{r.email}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="text">
            <TabsList>
              <TabsTrigger value="text">Paste Emails</TabsTrigger>
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="text">
              <div>
                <textarea
                  className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: '#d9d9d9', minHeight: 200, resize: 'vertical' }}
                  placeholder={"Enter emails, one per line or comma-separated:\nuser1@example.com\nuser2@example.com"}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
                {emailCount > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {emailCount} valid email{emailCount !== 1 ? 's' : ''} detected
                    {emailCount >= MAX_EMAILS && ` (max ${MAX_EMAILS})`}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="csv">
              <div className="flex items-center justify-center rounded border-2 border-dashed border-gray-300 p-8">
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      setTextValue(text);
                    };
                    reader.readAsText(file);
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          {results ? (
            <Button onClick={handleClose}>
              Done
            </Button>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                disabled={isLoading || emailCount === 0}
                onClick={handleInvite}
              >
                {isLoading && <Spinner size="sm" className="mr-2" />}
                Invite {emailCount > 0 ? `(${emailCount})` : ''}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

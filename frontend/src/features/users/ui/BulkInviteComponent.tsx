import { App, Button, Modal, Tabs } from 'antd';
import { useCallback, useState } from 'react';

import type { BulkInviteResponse } from '../../../entity/users';
import { userApi } from '../../../entity/users';

interface Props {
  open: boolean;
  onClose: () => void;
  onInviteComplete: () => void;
}

const MAX_EMAILS = 500;

export function BulkInviteComponent({ open, onClose, onInviteComplete }: Props) {
  const { message } = App.useApp();
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
      message.warning('No valid emails found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userApi.bulkInviteUsers({ emails });
      setResults(response);
      message.success(`Invited ${response.invited.length} user(s)`);
      onInviteComplete();
    } catch (e) {
      message.error((e as Error).message);
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
    <Modal
      title="Bulk Invite Users"
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        results ? (
          <Button type="primary" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              loading={isLoading}
              disabled={emailCount === 0}
              onClick={handleInvite}
            >
              Invite {emailCount > 0 ? `(${emailCount})` : ''}
            </Button>
          </div>
        )
      }
    >
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
        <Tabs
          items={[
            {
              key: 'text',
              label: 'Paste Emails',
              children: (
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
              ),
            },
            {
              key: 'csv',
              label: 'Upload CSV',
              children: (
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
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}

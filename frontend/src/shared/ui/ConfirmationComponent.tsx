import type { JSX } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  onConfirm(): void;
  onDecline(): void;

  description: string;
  actionButtonColor: 'blue' | 'red';

  actionText: string;
  cancelText?: string;
  hideCancelButton?: boolean;
}

export function ConfirmationComponent({
  onConfirm,
  onDecline,
  description,
  actionButtonColor,
  actionText,
  cancelText,
  hideCancelButton = false,
}: Props): JSX.Element {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDecline();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmation</DialogTitle>
        </DialogHeader>

        <div dangerouslySetInnerHTML={{ __html: description }} />

        <div className="mt-5 flex">
          {!hideCancelButton && (
            <Button
              className="ml-auto"
              variant={actionButtonColor !== 'red' ? 'destructive' : 'default'}
              onClick={() => onDecline()}
            >
              {cancelText || 'Cancel'}
            </Button>
          )}

          <Button
            className="ml-1"
            variant={actionButtonColor === 'red' ? 'destructive' : 'default'}
            onClick={() => onConfirm()}
          >
            {actionText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

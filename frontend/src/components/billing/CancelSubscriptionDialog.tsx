/**
 * Cancel Subscription Dialog
 * Confirmation dialog for subscription cancellation
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isCancelling: boolean;
}

export const CancelSubscriptionDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isCancelling,
}: CancelSubscriptionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription?</DialogTitle>
          <DialogDescription>
            Your subscription will remain active until the end of your current billing period. After
            that, you'll be downgraded to the Free plan and lose access to premium features.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Subscription
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isCancelling}>
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

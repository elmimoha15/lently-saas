/**
 * Cancel Subscription Dialog
 * Confirmation dialog for subscription cancellation
 */

import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
            Are you sure you want to cancel your subscription? This action will:
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Your subscription will be set to cancel at the end of your billing period</li>
              <li><strong>You keep full access until your billing period ends</strong></li>
              <li>Auto-renew will be turned off - you won't be charged again</li>
              <li>Usage limits remain based on your current paid plan until then</li>
              <li>When your period ends, you'll be downgraded to the Free plan (1 video/month, 2 AI questions/month, 100 comments/video)</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              All your data, videos, and analysis history will be preserved. You can resubscribe anytime before your period ends to keep your plan.
            </p>
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
          >
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

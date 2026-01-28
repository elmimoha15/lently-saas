/**
 * Global Upgrade Modal
 * 
 * This component renders the upgrade modal globally and connects to the
 * UpgradeModalProvider context. Place this component once in your app root
 * (App.tsx) to enable the upgrade modal functionality across all pages.
 */

import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { useUpgradeModal } from '@/hooks/useUpgradeModal';

export function GlobalUpgradeModal() {
  const { isOpen, quotaInfo, hideUpgradeModal } = useUpgradeModal();

  if (!quotaInfo) {
    return null;
  }

  return (
    <UpgradeModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) hideUpgradeModal();
      }}
      limitType={quotaInfo.limitType}
      currentUsage={quotaInfo.currentUsage}
      currentLimit={quotaInfo.currentLimit}
    />
  );
}

export default GlobalUpgradeModal;

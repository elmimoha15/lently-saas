import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Upload, AlertTriangle, Loader2, User, Bell, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import { userApi } from '@/services/api.service';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { currentPlan, usage, isLoading: isBillingLoading } = useBilling();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState(user?.profile.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [analysisComplete, setAnalysisComplete] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Show loading state if user is not loaded yet
  if (!user || isBillingLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Display name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await userApi.updateProfile({ display_name: displayName });
      if (response.data) {
        toast({
          title: 'Profile saved',
          description: 'Your profile has been updated successfully.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await userApi.deleteAccount();
      if (response.data) {
        toast({
          title: 'Account deleted',
          description: 'Your account and all data have been permanently deleted.',
        });
        // Sign out and redirect to landing page
        await signOut();
        navigate('/', { replace: true });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again or contact support.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  // Get user initials for avatar
  const initials = user.profile.displayName
    ? user.profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || '?';

  // Calculate what user will lose
  const analysisCount = usage?.videos_used || 0;
  const conversationCount = usage?.ai_questions_used || 0;

  return (
    <MainLayout>
      <div className="min-h-screen flex items-start justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl space-y-6"
        >
          <h1 className="text-3xl font-bold">Settings</h1>

          {/* Profile Section */}
          <section className="card-premium">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Profile</h2>
            </div>
            
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {initials}
                </div>
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-premium w-full"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={user.profile.email || user.email || ''}
                      readOnly
                      className="input-premium w-full bg-muted"
                    />
                    {user.email && (
                      <span className="flex items-center gap-1 text-xs text-green-600 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Current Plan</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentPlan?.name || 'Free'}
                      readOnly
                      className="input-premium w-full bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/settings/billing')}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving || displayName === user.profile.displayName}
              className="btn-primary mt-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </section>

          {/* Notifications Section */}
          <section className="card-premium">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive emails about your account activity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Analysis Complete</p>
                  <p className="text-sm text-muted-foreground">Get notified when video analysis is done</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analysisComplete}
                    onChange={(e) => setAnalysisComplete(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">Summary of your analytics every week</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="card-premium border-2 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. All your data will be permanently deleted.
              </p>

              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">This will permanently delete:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{analysisCount} video {analysisCount === 1 ? 'analysis' : 'analyses'}</li>
                  <li>{conversationCount} AI {conversationCount === 1 ? 'conversation' : 'conversations'}</li>
                  <li>All usage history and statistics</li>
                  <li>Your {currentPlan?.name || 'Free'} plan subscription</li>
                  <li>Account credentials and profile data</li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </section>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !isDeleting && setShowDeleteDialog(open)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3">
              <div className="font-semibold text-foreground">
                This action is permanent and cannot be undone.
              </div>
              
              <div>You will lose access to:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>{analysisCount}</strong> video {analysisCount === 1 ? 'analysis' : 'analyses'} with all insights</li>
                <li><strong>{conversationCount}</strong> AI {conversationCount === 1 ? 'conversation' : 'conversations'}</li>
                <li>Your <strong>{currentPlan?.name || 'Free'}</strong> plan {currentPlan?.name !== 'Free' && '(subscription will be canceled)'}</li>
                <li>All usage history and data</li>
              </ul>

              <div className="text-destructive font-medium mt-4">
                Are you absolutely sure you want to continue?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete My Account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Settings;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Upload } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const handleSaveProfile = () => {
    // TODO: Implement profile update API call
    toast({
      title: 'Profile saved',
      description: 'Your profile has been updated successfully.',
    });
  };

  // Get user initials for avatar
  const initials = user.display_name
    ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || '?';

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8 max-w-3xl"
      >
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* Profile Section */}
        <section className="card-premium">
          <h2 className="text-xl font-semibold mb-6">Profile</h2>
          
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
                    value={user.email}
                    readOnly
                    className="input-premium w-full bg-muted"
                  />
                  {user.email_verified && (
                    <span className="flex items-center gap-1 text-xs text-success px-2 py-1 bg-success-light rounded-full">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveProfile} className="btn-primary mt-6">
            Save Changes
          </Button>
        </section>

        {/* Danger Zone */}
        <section className="card-premium border-destructive/20">
          <h2 className="text-xl font-semibold text-destructive mb-4">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            Delete Account
          </Button>
        </section>
      </motion.div>
    </MainLayout>
  );
};

const UsageRow = ({ label, current, limit }: { label: string; current: number; limit: number }) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isOver = current > limit;

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className={isOver ? 'text-warning font-medium' : ''}>
          {current}/{limit}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            background: isOver
              ? 'linear-gradient(90deg, hsl(38, 92%, 50%), hsl(28, 92%, 45%))'
              : undefined,
          }}
        />
      </div>
    </div>
  );
};

const PreferenceRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default Settings;

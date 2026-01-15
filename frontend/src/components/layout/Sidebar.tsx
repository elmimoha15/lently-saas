import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video, 
  MessageSquare, 
  FileText, 
  Settings, 
  CreditCard,
  LogOut,
  Flame,
  Plus
} from 'lucide-react';
import { currentUser, getPlanBadgeClass } from '@/data/users';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Video, label: 'Videos', path: '/videos' },
  { icon: MessageSquare, label: 'Ask AI', path: '/ai' },
  { icon: FileText, label: 'Templates', path: '/templates' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: CreditCard, label: 'Billing', path: '/billing' },
];

export const Sidebar = () => {
  const location = useLocation();
  const user = currentUser;

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-red transition-shadow">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-logo text-xl font-medium tracking-tight">Lently</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    relative flex items-center gap-3 px-4 h-11 rounded-lg
                    transition-all duration-200 group
                    ${active 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground'
                    }
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'group-hover:text-foreground'}`} />
                  <span className="text-[15px]">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Analyze New Video Button */}
        <div className="mt-6 px-1">
          <Link
            to="/analyze"
            className="flex items-center justify-center gap-2 w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-all hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Analyze Video</span>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/[0.03]">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-0.5 ${getPlanBadgeClass(user.plan)}`}>
              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
            </span>
          </div>
        </div>
        <button className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5">
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

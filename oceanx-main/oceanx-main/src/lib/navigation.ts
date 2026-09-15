import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  Clock,
  Cpu,
  LayoutDashboard,
  ListTree,
  Navigation,
  Satellite,
  Settings,
  ShieldAlert,
  Ship,
  Users,
  Waves
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: 'Operations' | 'Investigation' | 'Intelligence' | 'System';
  badgeKey?: 'alerts' | 'incidents';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Command Dashboard', icon: LayoutDashboard, group: 'Operations' },
  { href: '/detection', label: 'Oil Spill Detection', icon: Waves, group: 'Operations' },
  { href: '/incidents', label: 'Incidents', icon: ListTree, group: 'Operations', badgeKey: 'incidents' },
  { href: '/alerts', label: 'Alerts Centre', icon: Bell, group: 'Operations', badgeKey: 'alerts' },
  { href: '/ais', label: 'AIS Vessel Tracking', icon: Ship, group: 'Investigation' },
  { href: '/attribution', label: 'Vessel Attribution', icon: ShieldAlert, group: 'Investigation' },
  { href: '/forecast', label: 'Drift Forecast', icon: Navigation, group: 'Investigation' },
  { href: '/satellite', label: 'Satellite Explorer', icon: Satellite, group: 'Investigation' },
  { href: '/timeline', label: 'Incident Timeline', icon: Clock, group: 'Intelligence' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, group: 'Intelligence' },
  { href: '/data-sources', label: 'Data Sources', icon: Activity, group: 'System' },
  { href: '/model-status', label: 'AI Model Status', icon: Brain, group: 'System' },
  { href: '/settings', label: 'Settings', icon: Settings, group: 'System' },
  { href: '/admin', label: 'User Management', icon: Users, group: 'System' }
];

export const NAV_GROUPS: NavItem['group'][] = ['Operations', 'Investigation', 'Intelligence', 'System'];

export { Cpu };

'use client';

import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Layers,
  Mail,
  Database,
  CheckCircle2,
  PlusCircle,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface SidebarProps {
  activeTab: 'scanner' | 'dashboard' | 'crm' | 'outreach' | 'database';
  setActiveTab: (tab: 'scanner' | 'dashboard' | 'crm' | 'outreach' | 'database') => void;
  leadsCount: number;
  isSupabaseConnected: boolean;
  onNewScanClick: () => void;
  onBackToHome?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userProfile?: UserProfile;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  leadsCount,
  isSupabaseConnected,
  onNewScanClick,
  onBackToHome,
  isMobileOpen,
  setIsMobileOpen,
  userProfile,
  onOpenProfile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'crm' as const,
      label: 'CRM Pipeline',
      icon: Layers,
      badge: leadsCount > 0 ? leadsCount : null,
    },
    {
      id: 'outreach' as const,
      label: 'Email Studio',
      icon: Mail,
      badge: null,
    },
    {
      id: 'database' as const,
      label: 'Supabase DB',
      icon: Database,
      badge: isSupabaseConnected ? 'connected' : null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (onBackToHome) {
                onBackToHome();
              } else {
                setActiveTab('scanner');
              }
              setIsMobileOpen(false);
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
            title="Click to return to homepage"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 font-heading block leading-none">
                Pitchr
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                WEBSITE AUDIT CRM
              </span>
            </div>
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Middle: Navigation Links */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && item.badge === 'connected' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : item.badge ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 font-semibold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Bottom: Fast Action & User Profile Avatar */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/60">
          <button
            onClick={() => {
              onNewScanClick();
              setIsMobileOpen(false);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-all shadow-xs active:scale-[0.98]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Website Scan</span>
          </button>

          {/* User Profile Avatar Card (Click to open profile, settings, logout) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              setIsMobileOpen(false);
            }}
            className="w-full p-2 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between text-left transition-all shadow-2xs group cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            title="Account profile, settings & logout"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-8 w-8 rounded-xl bg-gradient-to-br ${
                  userProfile?.avatarColor || 'from-emerald-500 to-teal-600'
                } flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0`}
              >
                {userProfile?.name
                  ? userProfile.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'TL'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-900 block truncate leading-tight group-hover:text-emerald-700 transition-colors">
                  {userProfile?.name || 'Tariq Lanez'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block truncate">
                  {userProfile?.email || 'tariqlanez77@gmail.com'}
                </span>
              </div>
            </div>

            <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
              <Settings className="h-3.5 w-3.5" />
            </div>
          </button>

          {onBackToHome && (
            <button
              onClick={() => {
                onBackToHome();
                setIsMobileOpen(false);
              }}
              className="w-full text-center text-[10px] font-mono text-slate-400 hover:text-slate-700 pt-0.5 transition-colors"
            >
              ← Back to Homepage
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

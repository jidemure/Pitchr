'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Settings,
  LogOut,
  Check,
  Building2,
  Mail,
  Shield,
  Sparkles,
  Database
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { saveStoredUserProfile } from '@/lib/storage';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onOpenSupabaseModal: () => void;
  isSupabaseConnected: boolean;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onLogout,
  onOpenSupabaseModal,
  isSupabaseConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'logout'>('profile');

  // Form states
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [agencyName, setAgencyName] = useState(profile.agencyName);
  const [role, setRole] = useState(profile.role);
  const [senderName, setSenderName] = useState(profile.senderName);
  const [defaultOffer, setDefaultOffer] = useState(profile.defaultOffer);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || 'from-emerald-500 to-teal-600');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const colorOptions = [
    { label: 'Emerald', value: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
    { label: 'Blue', value: 'from-blue-600 to-indigo-600', dot: 'bg-blue-500' },
    { label: 'Violet', value: 'from-violet-600 to-purple-600', dot: 'bg-violet-500' },
    { label: 'Amber', value: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
    { label: 'Rose', value: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      name,
      email,
      agencyName,
      role,
      senderName,
      defaultOffer,
      avatarColor,
    };
    saveStoredUserProfile(updated);
    onUpdateProfile(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (n.slice(0, 2) || 'TL').toUpperCase();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Top Header Banner */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-base font-bold shadow-xs shrink-0`}
            >
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 font-heading truncate">
                {name}
              </h2>
              <p className="text-xs text-slate-500 truncate font-mono">
                {email}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <Shield className="h-2.5 w-2.5" />
                <span>{role || 'Agency Founder'}</span>
                <span>•</span>
                <span>{agencyName}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close profile modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-100 px-4 sm:px-6 bg-white gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('logout')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'logout'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: Edit Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                    Agency / Business
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Avatar theme color */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Avatar Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAvatarColor(opt.value)}
                      className={`h-7 w-7 rounded-full bg-gradient-to-br ${opt.value} transition-transform flex items-center justify-center text-white ${
                        avatarColor === opt.value ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110' : 'hover:scale-105'
                      }`}
                      title={opt.label}
                    >
                      {avatarColor === opt.value && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98]"
                >
                  {isSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Changes Saved!</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Default Cold Email Sender Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Tariq"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400">
                  Used automatically in all generated email hooks and sign-offs.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Default Pitch Offer / Hook
                </label>
                <input
                  type="text"
                  value={defaultOffer}
                  onChange={(e) => setDefaultOffer(e.target.value)}
                  placeholder="e.g. Free 2-minute mobile wireframe walkthrough"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400">
                  Custom lead magnet offer inserted into Touch 1 & Touch 2 proposals.
                </span>
              </div>

              {/* Database Setting Card */}
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block font-heading">
                      Supabase Cloud Sync
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isSupabaseConnected ? 'Connected & ready for live sync' : 'Offline Mode (Local Storage)'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseModal();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors shrink-0"
                >
                  Configure DB
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98]"
                >
                  {isSaved ? 'Settings Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Logout */}
          {activeTab === 'logout' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs sm:text-sm">
                  <LogOut className="h-4 w-4" />
                  <span>Sign out of Pitchr Workspace</span>
                </div>
                <p className="text-xs text-rose-900/80 leading-relaxed">
                  You are currently logged in as <strong>{email}</strong>. Logging out will close the workspace session and return you to the main homepage.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

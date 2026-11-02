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
  Database,
  Send,
  Server,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { UserProfile, EmailProvider } from '@/lib/types';
import { saveStoredUserProfile } from '@/lib/storage';
import { EMAIL_PROVIDERS_META } from '@/lib/emailDispatcher';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onOpenSupabaseModal: () => void;
  isSupabaseConnected: boolean;
  onClearAllData?: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onLogout,
  onOpenSupabaseModal,
  isSupabaseConnected,
  onClearAllData,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [activeTab, setActiveTab] = useState<'profile' | 'email_providers' | 'settings' | 'logout'>('profile');

  // Form states
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [agencyName, setAgencyName] = useState(profile.agencyName);
  const [role, setRole] = useState(profile.role);
  const [senderName, setSenderName] = useState(profile.senderName);
  const [defaultOffer, setDefaultOffer] = useState(profile.defaultOffer);
  const [signature, setSignature] = useState(profile.signature || 'Website Design & Redesign | Lagos, Nigeria\nkoravale.studio@gmail.com | koravale.com');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || 'from-emerald-500 to-teal-600');
  const [preferredProvider, setPreferredProvider] = useState<import('@/lib/types').EmailProvider>(
    profile.preferredProvider || 'gmail'
  );
  const [gmailAccountEmail, setGmailAccountEmail] = useState<string>(
    profile.gmailAccountEmail || profile.email || 'outreach@apexstudio.io'
  );

  // Custom SMTP states
  const [smtpHost, setSmtpHost] = useState(profile.customSmtp?.host || '');
  const [smtpPort, setSmtpPort] = useState(profile.customSmtp?.port || 587);
  const [smtpSecure, setSmtpSecure] = useState(profile.customSmtp?.secure || false);
  const [smtpUser, setSmtpUser] = useState(profile.customSmtp?.auth?.user || '');
  const [smtpPass, setSmtpPass] = useState(profile.customSmtp?.auth?.pass || '');
  const [smtpFromEmail, setSmtpFromEmail] = useState(profile.customSmtp?.fromEmail || profile.email || '');
  const [smtpFromName, setSmtpFromName] = useState(profile.customSmtp?.fromName || profile.senderName || profile.name || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  const handleFillGmailSmtpPreset = (targetEmail = 'outreach@apexstudio.io') => {
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(465);
    setSmtpSecure(true);
    setSmtpUser(targetEmail);
    setSmtpFromEmail(targetEmail);
    setSmtpFromName(senderName || name || 'Alex | Apex Studio');
    setGmailAccountEmail(targetEmail);
    setPreferredProvider('custom_smtp');
  };

  if (!isOpen) return null;

  const colorOptions = [
    { label: 'Emerald', value: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
    { label: 'Blue', value: 'from-blue-600 to-indigo-600', dot: 'bg-blue-500' },
    { label: 'Obsidian', value: 'from-slate-800 to-slate-950', dot: 'bg-slate-900' },
    { label: 'Amber', value: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
    { label: 'Rose', value: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  ];

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          smtp: {
            host: smtpHost,
            port: Number(smtpPort),
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            fromEmail: smtpFromEmail,
            fromName: smtpFromName,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpTestResult({
          success: true,
          message: data.message || 'SMTP Connection Verified Successfully!',
        });
      } else {
        setSmtpTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with SMTP server. Check credentials.',
        });
      }
    } catch (err: unknown) {
      setSmtpTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Network error testing SMTP',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: UserProfile = {
      name,
      email,
      agencyName,
      role,
      senderName,
      defaultOffer,
      signature,
      avatarColor,
      preferredProvider,
      gmailAccountEmail,
      customSmtp: {
        host: smtpHost,
        port: Number(smtpPort),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        fromEmail: smtpFromEmail || email,
        fromName: smtpFromName || senderName,
        configured: Boolean(smtpHost && smtpUser && smtpPass),
      },
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
            onClick={() => setActiveTab('email_providers')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'email_providers'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Providers</span>
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

              {/* Cold Email Signature */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Cold Email Signature
                </label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={2}
                  placeholder="Website Design & Redesign | Lagos, Nigeria&#10;koravale.studio@gmail.com | koravale.com"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-400">
                  Appears below your name in cold emails and follow-ups.
                </span>
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

          {/* TAB 2: Email Providers & Accounts */}
          {activeTab === 'email_providers' && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-slate-900 block font-heading">
                  Preferred Outreach Provider
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the default email service used when launching single-click pitches and follow-ups.
                </p>
              </div>

              {/* Provider Selector Cards: Gmail, Outlook, Yahoo, Custom SMTP, Default Mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['gmail', 'outlook', 'yahoo', 'custom_smtp', 'mailto'] as EmailProvider[]).map((pKey) => {
                  const meta = EMAIL_PROVIDERS_META[pKey];
                  const isSelected = preferredProvider === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPreferredProvider(pKey)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 ${meta.color}`}>
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d={meta.iconSvg} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 font-heading">
                            {meta.name}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dedicated Gmail Configuration Section */}
              <div className="p-4 rounded-xl border border-red-200/90 bg-red-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-xs font-heading">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d={EMAIL_PROVIDERS_META.gmail.iconSvg} />
                    </svg>
                    <span>Gmail Web Account Configuration</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full border border-red-200">
                    authuser routing
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-normal">
                  When you click <strong>Gmail</strong>, Pitchr opens Google Mail prefilled with the outreach pitch and passes <code className="text-red-700 bg-red-100/70 px-1 py-0.5 rounded font-mono">authuser={gmailAccountEmail || 'outreach@apexstudio.io'}</code> so it automatically targets this specific Google account even with multiple accounts logged in.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                    Target Gmail Address
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={gmailAccountEmail}
                      onChange={(e) => setGmailAccountEmail(e.target.value)}
                      placeholder="e.g. outreach@apexstudio.io"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGmailAccountEmail('outreach@apexstudio.io');
                        setEmail('outreach@apexstudio.io');
                        setAgencyName('Veloce AI');
                        setSenderName('Alex');
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors shrink-0 shadow-2xs"
                    >
                      Fill outreach@apexstudio.io
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom SMTP Configuration Drawer / Panel */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-700" />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block font-heading">
                        Direct SMTP Sending (In-App Dispatch)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Supports Gmail SMTP (smtp.gmail.com), SendGrid, Mailgun, AWS SES, or custom server
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFillGmailSmtpPreset(email || 'your-email@gmail.com')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-[11px] font-semibold transition-colors shrink-0"
                  >
                    <span>⚡ Fill Gmail SMTP (julian.veloceai)</span>
                  </button>
                </div>

                {/* Helpful Guide for Gmail App Passwords */}
                <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 leading-normal space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-amber-950">
                    <span>💡 Sending directly through Gmail SMTP (smtp.gmail.com):</span>
                  </div>
                  <p>
                    Google requires an <strong>App Password</strong> rather than your standard account password:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] pl-1 text-amber-800">
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-medium text-amber-950 hover:text-black">Google Account Security → App Passwords</a>.</li>
                    <li>Generate a 16-letter password (select app: <em>Mail</em> or name it <em>Pitchr</em>).</li>
                    <li>Paste the 16 characters into the <strong>SMTP Password</strong> field below and click <strong>Test Connection</strong>.</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      SMTP Host / Server
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.sendgrid.net or mail.myagency.com"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587 or 465"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="apikey or user@myagency.com"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      SMTP Password / API Key
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                      placeholder="hello@myagency.com"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      From Display Name
                    </label>
                    <input
                      type="text"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                      placeholder="e.g. Alex | Apex Studio"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span>Require SSL/TLS (Port 465)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp || !smtpHost || !smtpUser}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isTestingSmtp ? (
                      <>
                        <span className="h-3 w-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Server className="h-3 w-3 text-slate-400" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                      smtpTestResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    {smtpTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{smtpTestResult.message}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98]"
                >
                  {isSaved ? 'Providers Saved!' : 'Save Email Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Settings */}
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
                  placeholder="e.g. Alex"
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

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Cold Email Signature
                </label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={2}
                  placeholder="Website Design & Redesign | Lagos, Nigeria&#10;koravale.studio@gmail.com | koravale.com"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-400">
                  Appears below your name in cold emails and follow-ups.
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

              {/* Fresh Start / Reset Data Option */}
              {onClearAllData && (
                <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-rose-900 block font-heading">
                      Live Data Clean State
                    </span>
                    <span className="text-[11px] text-rose-700/80">
                      Clear all cached leads, scans, and sequences to start 100% fresh.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all stored leads and sequences?')) {
                        onClose();
                        onClearAllData();
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-700 shadow-2xs transition-colors shrink-0"
                  >
                    Clear All Data
                  </button>
                </div>
              )}

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

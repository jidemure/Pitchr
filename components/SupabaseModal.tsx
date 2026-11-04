'use client';

import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  X,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { SupabaseConfig, Lead, AuditReport, EmailSequence } from '@/lib/types';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  syncLeadToSupabase
} from '@/lib/storage';
import { getSupabaseClient, SUPABASE_SQL_SCHEMA } from '@/lib/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: (config: SupabaseConfig) => void;
  leads: Lead[];
  audits: Record<string, AuditReport>;
  sequences: Record<string, EmailSequence>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  leads,
  audits,
  sequences,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const projectRef = React.useMemo(() => {
    try {
      if (!config.url) return null;
      const host = new URL(config.url).hostname;
      return host.split('.')[0] || null;
    } catch {
      return null;
    }
  }, [config.url]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!config.url || !config.anonKey) {
      setTestResult({ success: false, message: 'Please provide both Project URL and Anon API Key.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = getSupabaseClient(config.url, config.anonKey);
      if (!client) {
        setTestResult({ success: false, message: 'Could not construct Supabase client.' });
        setIsTesting(false);
        return;
      }

      const { error } = await client.from('leads').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message?.includes('relation "public.leads" does not exist') ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache');

        if (isTableMissing) {
          setTestResult({
            success: false,
            message: 'Connected to Supabase project, but database tables (leads, audits, email_sequences) do not exist yet! Click "Open SQL Editor" or "Copy SQL" below and run it in your Supabase SQL editor.',
          });
          const updated = { ...config, isConnected: true };
          setConfig(updated);
          saveStoredSupabaseConfig(updated);
          onConfigUpdated(updated);
        } else {
          setTestResult({ success: false, message: `Connection failed: ${error.message}` });
        }
      } else {
        setTestResult({ success: true, message: 'Successfully connected and verified Supabase database tables!' });
        const updated = { ...config, isConnected: true };
        setConfig(updated);
        saveStoredSupabaseConfig(updated);
        onConfigUpdated(updated);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndSync = async () => {
    if (!config.isConnected) {
      await handleTestConnection();
    }

    setIsSyncing(true);
    setSyncStatus('Syncing leads to Supabase...');

    let syncedCount = 0;
    let failedCount = 0;
    let lastError = '';
    for (const lead of leads) {
      const audit = lead.auditId ? audits[lead.auditId] : undefined;
      const seq = lead.campaignId ? sequences[lead.campaignId] : undefined;
      const res = await syncLeadToSupabase(lead, audit, seq);
      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
        lastError = res.error || 'Sync error';
      }
    }

    if (failedCount > 0 && syncedCount === 0) {
      setSyncStatus(`Sync paused: ${lastError}. Make sure the SQL tables have been created in your Supabase project.`);
    } else {
      const updated = {
        ...config,
        syncEnabled: true,
        lastSyncedAt: new Date().toISOString(),
      };
      setConfig(updated);
      saveStoredSupabaseConfig(updated);
      onConfigUpdated(updated);
      setSyncStatus(`Successfully synced ${syncedCount} of ${leads.length} leads to Supabase!`);
    }
    setIsSyncing(false);
  };

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Supabase Cloud Sync Modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-medium text-slate-900 font-heading">
                Supabase Persistence
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Sync leads, audits, and sequences with PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Credentials Form */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full text-xs sm:text-sm p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono min-h-[42px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Supabase Anon Key (Public API Key)
            </label>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full text-xs sm:text-sm p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono min-h-[42px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.url || !config.anonKey}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50 min-h-[40px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing || !config.url || !config.anonKey}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs disabled:opacity-50 min-h-[40px]"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isSyncing ? 'Syncing Leads...' : 'Save & Sync All Leads'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {syncStatus && (
            <div className="p-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}
        </div>

        {/* SQL Schema Script Helper */}
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 font-heading block">
                Database Schema (DDL)
              </span>
              <p className="text-[11px] text-slate-500">
                Run once in Supabase SQL Editor:
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {projectRef && (
                <a
                  href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-xs min-h-[32px]"
                >
                  <span>Open SQL Editor ↗</span>
                </a>
              )}
              <button
                onClick={handleCopySchema}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs min-h-[32px]"
              >
                {copiedSchema ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>

          <pre className="p-2.5 sm:p-3 bg-slate-900 text-emerald-300 rounded-xl text-[10px] sm:text-[11px] font-mono overflow-x-auto max-h-40 border border-slate-800 leading-normal select-all">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono text-center sm:text-left">
            Local persistence is active as default.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors min-h-[38px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

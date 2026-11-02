'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Search,
  ExternalLink,
  Mail,
  Eye,
  Trash2,
  Download,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { Lead, LeadStatus } from '@/lib/types';
import { formatAuditDate } from '@/lib/storage';

interface LeadsPipelineViewProps {
  leads: Lead[];
  onSelectLeadForAudit: (lead: Lead) => void;
  onSelectLeadForEmail: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onExportCSV: () => void;
  onSyncSupabase?: () => void;
}

export const LeadsPipelineView: React.FC<LeadsPipelineViewProps> = ({
  leads,
  onSelectLeadForAudit,
  onSelectLeadForEmail,
  onUpdateLeadStatus,
  onDeleteLead,
  onExportCSV,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'score' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const industryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (industryDropdownRef.current && !industryDropdownRef.current.contains(event.target as Node)) {
        setIsIndustryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueIndustries = Array.from(new Set(leads.map((l) => l.industry).filter(Boolean)));

  const statusOptions = [
    { value: 'all', label: 'All Statuses', dotColor: 'bg-slate-400', count: leads.length },
    { value: 'drafted', label: 'Draft Ready', dotColor: 'bg-blue-500', count: leads.filter((l) => l.status === 'drafted').length },
    { value: 'contacted', label: 'Contacted', dotColor: 'bg-indigo-500', count: leads.filter((l) => l.status === 'contacted').length },
    { value: 'replied', label: 'Replied', dotColor: 'bg-emerald-500', count: leads.filter((l) => l.status === 'replied').length },
    { value: 'audited', label: 'Audited', dotColor: 'bg-amber-500', count: leads.filter((l) => l.status === 'audited').length },
    { value: 'converted', label: 'Converted', dotColor: 'bg-purple-500', count: leads.filter((l) => l.status === 'converted').length },
  ];

  // Filter & sort
  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.industry.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesIndustry = industryFilter === 'all' || lead.industry.toLowerCase() === industryFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesIndustry;
    })
    .sort((a, b) => {
      if (sortField === 'score') {
        return sortAsc ? a.overallScore - b.overallScore : b.overallScore - a.overallScore;
      } else {
        const timeA = new Date(a.lastAuditedAt).getTime();
        const timeB = new Date(b.lastAuditedAt).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
    });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const avgScore =
    leads.length > 0
      ? Math.round(leads.reduce((acc, curr) => acc + curr.overallScore, 0) / leads.length)
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Total Leads</span>
          <span className="text-xl sm:text-2xl font-medium font-mono text-slate-900 mt-1 block tabular-nums">{leads.length}</span>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Prospect pipeline</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Average Score</span>
          <span className="text-xl sm:text-2xl font-medium font-mono text-slate-900 mt-1 block tabular-nums">{avgScore}/100</span>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Lower = higher urgency</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Drafted / Ready</span>
          <span className="text-xl sm:text-2xl font-medium font-mono text-blue-700 mt-1 block tabular-nums">
            {leads.filter((l) => l.status === 'drafted' || l.status === 'audited').length}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Ready to pitch</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Contacted</span>
          <span className="text-xl sm:text-2xl font-medium font-mono text-emerald-700 mt-1 block tabular-nums">
            {leads.filter((l) => l.status === 'contacted' || l.status === 'replied' || l.status === 'converted').length}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400">In conversation</span>
        </div>
      </div>

      {/* Main CRM Table / Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px]"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Status Filter Tabs - Scrollable on mobile */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-none max-w-full">
              {['all', 'audited', 'drafted', 'contacted', 'replied'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap min-h-[30px] ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs shrink-0 min-h-[36px]"
              title="Download Leads CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(statusFilter !== 'all' || industryFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-emerald-50/60 border-b border-emerald-100/80 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">Filtered by:</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-mono text-[11px] shadow-2xs">
                <span>Status: <strong className="capitalize">{statusFilter}</strong></span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-emerald-950 p-0.5 rounded hover:bg-emerald-100/50"
                  title="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {industryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-mono text-[11px] shadow-2xs">
                <span>Industry: <strong>{industryFilter}</strong></span>
                <button
                  onClick={() => setIndustryFilter('all')}
                  className="hover:text-emerald-950 p-0.5 rounded hover:bg-emerald-100/50"
                  title="Remove industry filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('all');
                setIndustryFilter('all');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Mobile View: Dedicated Card List (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No leads found. Analyze a website in the Auditor tab to populate your pipeline.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block font-heading text-sm truncate">
                      {lead.companyName}
                    </span>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-emerald-700 font-mono inline-flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <span>{lead.url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs tabular-nums border shrink-0 ${getScoreColor(
                      lead.overallScore
                    )}`}
                  >
                    {lead.overallScore}/100
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate max-w-[140px]">{lead.industry}</span>
                  <span className="font-mono text-[11px]">{formatAuditDate(lead.lastAuditedAt)}</span>
                </div>

                {/* Status dropdown & quick actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                  <div className="flex-1">
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                      className="text-xs font-mono py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full min-h-[36px]"
                    >
                      <option value="audited">Audited</option>
                      <option value="drafted">Draft Ready</option>
                      <option value="contacted">Contacted</option>
                      <option value="replied">Replied</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onSelectLeadForAudit(lead)}
                      title="View scorecard"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onSelectLeadForEmail(lead)}
                      title="Open Email Studio"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Mail className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onDeleteLead(lead.id)}
                      title="Delete lead"
                      className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Data Table (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Company & Domain</th>

                {/* Industry Header with Dropdown Filter */}
                <th className="py-3 px-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Industry</span>
                    {uniqueIndustries.length > 0 && (
                      <div className="relative inline-block text-left" ref={industryDropdownRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsIndustryDropdownOpen(!isIndustryDropdownOpen);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                            industryFilter !== 'all'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold shadow-2xs'
                              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          title="Filter by industry"
                        >
                          <Filter className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate max-w-[65px]">{industryFilter === 'all' ? 'Filter' : industryFilter}</span>
                          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                        </button>

                        {isIndustryDropdownOpen && (
                          <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-1 text-xs text-slate-700 font-sans animate-fade-in normal-case">
                            <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold border-b border-slate-100 flex items-center justify-between">
                              <span>Industry Filter</span>
                              {industryFilter !== 'all' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIndustryFilter('all');
                                    setIsIndustryDropdownOpen(false);
                                  }}
                                  className="text-emerald-700 hover:text-emerald-900 text-[10px] font-medium"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIndustryFilter('all');
                                setIsIndustryDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                                industryFilter === 'all' ? 'bg-emerald-50 text-emerald-900 font-semibold' : ''
                              }`}
                            >
                              <span>All Industries</span>
                              {industryFilter === 'all' && <Check className="h-3 w-3 text-emerald-600" />}
                            </button>
                            {uniqueIndustries.map((ind) => (
                              <button
                                key={ind}
                                type="button"
                                onClick={() => {
                                  setIndustryFilter(ind);
                                  setIsIndustryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                                  industryFilter === ind ? 'bg-emerald-50 text-emerald-900 font-semibold' : ''
                                }`}
                              >
                                <span className="truncate max-w-[130px]">{ind}</span>
                                {industryFilter === ind && <Check className="h-3 w-3 text-emerald-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>

                <th
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800"
                  onClick={() => {
                    if (sortField === 'score') setSortAsc(!sortAsc);
                    else {
                      setSortField('score');
                      setSortAsc(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Audit Score</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Pipeline Stage Header with Dropdown Filter */}
                <th className="py-3 px-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Pipeline Stage</span>
                    <div className="relative inline-block text-left" ref={statusDropdownRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsStatusDropdownOpen(!isStatusDropdownOpen);
                          setIsIndustryDropdownOpen(false);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                          statusFilter !== 'all'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold shadow-2xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Filter leads by current status (e.g. drafted, contacted, replied)"
                      >
                        <Filter className="h-2.5 w-2.5 shrink-0" />
                        <span className="capitalize">{statusFilter === 'all' ? 'Filter' : statusFilter}</span>
                        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                      </button>

                      {isStatusDropdownOpen && (
                        <div className="absolute left-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-1 text-xs text-slate-700 font-sans animate-fade-in normal-case">
                          <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold border-b border-slate-100 flex items-center justify-between">
                            <span>Status Filter</span>
                            {statusFilter !== 'all' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusFilter('all');
                                  setIsStatusDropdownOpen(false);
                                }}
                                className="text-emerald-700 hover:text-emerald-900 text-[10px] font-medium"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setStatusFilter(opt.value);
                                setIsStatusDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                                statusFilter === opt.value ? 'bg-emerald-50 text-emerald-900 font-semibold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${opt.dotColor}`} />
                                <span className="capitalize">{opt.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {opt.count}
                                </span>
                                {statusFilter === opt.value && (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                <th
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800"
                  onClick={() => {
                    if (sortField === 'date') setSortAsc(!sortAsc);
                    else {
                      setSortField('date');
                      setSortAsc(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Audited</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No leads found matching your search. Analyze a website in the Auditor tab to populate your CRM.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block font-heading">
                          {lead.companyName}
                        </span>
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-500 hover:text-emerald-700 font-mono inline-flex items-center gap-1 truncate max-w-xs"
                        >
                          <span>{lead.url.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {lead.industry}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs tabular-nums border ${getScoreColor(
                          lead.overallScore
                        )}`}
                      >
                        {lead.overallScore}/100
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className="text-xs font-mono py-1 px-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="audited">Audited</option>
                        <option value="drafted">Draft Ready</option>
                        <option value="contacted">Contacted</option>
                        <option value="replied">Replied</option>
                        <option value="converted">Converted</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                      {formatAuditDate(lead.lastAuditedAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectLeadForAudit(lead)}
                          title="View detailed scorecard"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectLeadForEmail(lead)}
                          title="Open in Email Studio"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          title="Delete lead"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

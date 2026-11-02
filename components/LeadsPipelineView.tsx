'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Mail,
  Send,
  Eye,
  Trash2,
  ChevronDown,
  Layers,
  Database,
  ExternalLink,
  Check,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  MoreVertical,
  Tag,
  Plus,
  X,
  CheckSquare,
  Square,
  MinusSquare
} from 'lucide-react';
import { Lead, LeadStatus, EmailProvider } from '@/lib/types';
import { formatAuditDate, getStoredSequences, updateLeadFollowUp } from '@/lib/storage';
import { triggerDirectProviderLaunch, EMAIL_PROVIDERS_META } from '@/lib/emailDispatcher';
import { KanbanBoardView } from '@/components/KanbanBoardView';

const PRESET_TAGS = [
  'High Value',
  'Needs Redesign',
  'Mobile Flaws',
  'Slow Load',
  'Follow-up Due',
  'VIP',
  'E-commerce'
];

interface LeadsPipelineViewProps {
  leads: Lead[];
  onSelectLeadForAudit: (lead: Lead) => void;
  onSelectLeadForEmail: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onExportCSV: () => void;
  onSyncSupabase?: () => void;
  onOpenTeaser?: (lead: Lead) => void;
  onUpdateLeadTags?: (leadId: string, tags: string[]) => void;
  onBulkUpdateStatus?: (leadIds: string[], newStatus: LeadStatus) => void;
  onBulkDelete?: (leadIds: string[]) => void;
}

export const LeadsPipelineView: React.FC<LeadsPipelineViewProps> = ({
  leads,
  onSelectLeadForAudit,
  onSelectLeadForEmail,
  onUpdateLeadStatus,
  onDeleteLead,
  onExportCSV,
  onOpenTeaser,
  onUpdateLeadTags,
  onBulkUpdateStatus,
  onBulkDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'score' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [quickSendLeadId, setQuickSendLeadId] = useState<string | null>(null);
  const [activeActionMenuLeadId, setActiveActionMenuLeadId] = useState<string | null>(null);

  // Checkbox multi-select state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Inline Tag Popover state
  const [activeTagPopoverLeadId, setActiveTagPopoverLeadId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const industryDropdownRef = useRef<HTMLDivElement>(null);
  const quickSendRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const tagPopoverRef = useRef<HTMLDivElement>(null);

  // Close dropdowns and popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (industryDropdownRef.current && !industryDropdownRef.current.contains(event.target as Node)) {
        setIsIndustryDropdownOpen(false);
      }
      if (quickSendRef.current && !quickSendRef.current.contains(event.target as Node)) {
        setQuickSendLeadId(null);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenuLeadId(null);
      }
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(event.target as Node)) {
        setActiveTagPopoverLeadId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSend = (lead: Lead, provider: EmailProvider) => {
    const sequences = getStoredSequences();
    const seq = lead.campaignId ? sequences[lead.campaignId] : null;
    const currentStep = lead.followUp?.currentTouchStep || 1;
    const touch = seq?.touches?.find((t) => t.step === currentStep) || seq?.touches?.[0];

    const cleanDomain = lead.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const recipient = lead.contactEmail || `contact@${cleanDomain}`;
    const subject = touch?.subjectLines?.[0] || `${cleanDomain} website polish & redesign proposal`;
    const body = touch ? `${touch.body}\n\n${touch.cta}` : `Hi,\n\nI reviewed ${cleanDomain} and found several mobile conversion opportunities.`;

    triggerDirectProviderLaunch(provider, {
      to: recipient,
      subject,
      body,
    });

    updateLeadFollowUp(lead.id, currentStep, provider);
    onUpdateLeadStatus(lead.id, currentStep === 1 ? 'contacted' : lead.status);
    setQuickSendLeadId(null);
  };

  // Tag Management
  const handleAddTag = (leadId: string, tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const currentTags = targetLead.tags || [];
    if (!currentTags.includes(trimmed)) {
      const updatedTags = [...currentTags, trimmed];
      if (onUpdateLeadTags) {
        onUpdateLeadTags(leadId, updatedTags);
      }
    }
    setNewTagInput('');
    setActiveTagPopoverLeadId(null);
  };

  const handleRemoveTag = (leadId: string, tagToRemove: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const currentTags = targetLead.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    if (onUpdateLeadTags) {
      onUpdateLeadTags(leadId, updatedTags);
    }
  };

  // Bulk operations
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkStatusChange = (newStatus: LeadStatus) => {
    if (selectedLeadIds.length === 0) return;
    if (onBulkUpdateStatus) {
      onBulkUpdateStatus(selectedLeadIds, newStatus);
    } else {
      selectedLeadIds.forEach((id) => onUpdateLeadStatus(id, newStatus));
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedLeadIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}?`)) {
      if (onBulkDelete) {
        onBulkDelete(selectedLeadIds);
      } else {
        selectedLeadIds.forEach((id) => onDeleteLead(id));
      }
      setSelectedLeadIds([]);
    }
  };

  const handleBulkApplyTag = (tagToApply: string) => {
    const trimmed = tagToApply.trim();
    if (!trimmed || selectedLeadIds.length === 0) return;
    selectedLeadIds.forEach((id) => {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        const current = lead.tags || [];
        if (!current.includes(trimmed)) {
          if (onUpdateLeadTags) {
            onUpdateLeadTags(id, [...current, trimmed]);
          }
        }
      }
    });
    setBulkTagInput('');
    setIsBulkTagModalOpen(false);
  };

  const uniqueIndustries = Array.from(new Set(leads.map((l) => l.industry).filter(Boolean)));
  const allUniqueTags = Array.from(new Set(leads.flatMap((l) => l.tags || []).filter(Boolean)));

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
        lead.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.tags && lead.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesIndustry = industryFilter === 'all' || lead.industry.toLowerCase() === industryFilter.toLowerCase();
      const matchesTag = tagFilter === 'all' || (lead.tags && lead.tags.includes(tagFilter));
      return matchesSearch && matchesStatus && matchesIndustry && matchesTag;
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

  const isAllSelected = filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length;
  const isPartiallySelected = selectedLeadIds.length > 0 && selectedLeadIds.length < filteredLeads.length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in font-sans">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 font-heading">
                CRM Pipeline & Prospects
              </h1>
              <span className="text-xs font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track website audit scores, tag prospects, manage cold outreach touches, and monitor reply conversions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* View Mode Toggle: Table vs Kanban */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 shadow-2xs transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, domain, industry, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 placeholder-slate-400 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tag Filter */}
            {allUniqueTags.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase whitespace-nowrap">Tag:</span>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 whitespace-nowrap"
                >
                  <option value="all">All Tags</option>
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase whitespace-nowrap">Sort:</span>
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'score') {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortField('score');
                    setSortAsc(false);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  sortField === 'score'
                    ? 'bg-orange-50 text-orange-900 border-orange-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Score {sortField === 'score' ? (sortAsc ? '↑' : '↓') : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'date') {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortField('date');
                    setSortAsc(false);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  sortField === 'date'
                    ? 'bg-orange-50 text-orange-900 border-orange-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Date {sortField === 'date' ? (sortAsc ? '↑' : '↓') : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Actions Toolbar */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-[#191C21] text-white p-3 sm:px-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-[#2A2524]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold font-mono bg-orange-500/20 text-orange-300 px-2.5 py-1 rounded-lg border border-orange-500/30 whitespace-nowrap">
              {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'lead' : 'leads'} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedLeadIds([])}
              className="text-xs text-slate-400 hover:text-white underline transition-colors whitespace-nowrap"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Set Status */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">Move to:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value as LeadStatus);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-xs bg-[#242933] border border-[#3A4150] text-slate-100 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 whitespace-nowrap"
              >
                <option value="" disabled>Change stage...</option>
                <option value="audited">Audited</option>
                <option value="drafted">Draft Ready</option>
                <option value="contacted">Contacted</option>
                <option value="replied">Replied</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            {/* Bulk Add Tag */}
            <button
              type="button"
              onClick={() => setIsBulkTagModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Tag className="h-3.5 w-3.5 text-orange-400" />
              <span>Add Tag</span>
            </button>

            {/* Bulk Delete */}
            <button
              type="button"
              onClick={handleBulkDeleteConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {isBulkTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 font-heading">
                Add Tag to {selectedLeadIds.length} Selected Leads
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkTagModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Tag name</label>
              <input
                type="text"
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBulkApplyTag(bulkTagInput);
                }}
                placeholder="e.g. High Value, Q1 Outreach..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Preset tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handleBulkApplyTag(pt)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-700 transition-colors"
                  >
                    + {pt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkTagModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkApplyTag(bulkTagInput)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                Apply Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <KanbanBoardView
          leads={filteredLeads}
          onSelectLeadForAudit={onSelectLeadForAudit}
          onSelectLeadForEmail={onSelectLeadForEmail}
          onUpdateLeadStatus={onUpdateLeadStatus}
          onDeleteLead={onDeleteLead}
          onQuickSend={handleQuickSend}
          onOpenTeaser={onOpenTeaser}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                  {/* Select All Checkbox */}
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      aria-label="Select all leads"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-orange-600" />
                      ) : isPartiallySelected ? (
                        <MinusSquare className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    Company & Domain
                  </th>

                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    Tags
                  </th>

                  {/* Industry Header with Dropdown Filter */}
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
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
                                ? 'bg-orange-100 text-orange-800 border-orange-300 font-semibold shadow-2xs'
                                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Filter leads by industry"
                          >
                            <Filter className="h-2.5 w-2.5 shrink-0" />
                            <span className="capitalize truncate max-w-[80px]">
                              {industryFilter === 'all' ? 'All' : industryFilter}
                            </span>
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
                                    className="text-orange-700 hover:text-orange-900 text-[10px] font-medium"
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
                                  industryFilter === 'all' ? 'bg-orange-50 text-orange-900 font-semibold' : ''
                                }`}
                              >
                                <span>All Industries</span>
                                {industryFilter === 'all' && <Check className="h-3 w-3 text-orange-600" />}
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
                                    industryFilter === ind ? 'bg-orange-50 text-orange-900 font-semibold' : ''
                                  }`}
                                >
                                  <span className="truncate max-w-[130px]">{ind}</span>
                                  {industryFilter === ind && <Check className="h-3 w-3 text-orange-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>

                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800 whitespace-nowrap"
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
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
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
                              ? 'bg-orange-100 text-orange-800 border-orange-300 font-semibold shadow-2xs'
                              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          title="Filter leads by status"
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
                                  className="text-orange-700 hover:text-orange-900 text-[10px] font-medium"
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
                                  statusFilter === opt.value ? 'bg-orange-50 text-orange-900 font-semibold' : ''
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
                                    <Check className="h-3 w-3 text-orange-600" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>

                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Follow-up Step</span>
                    </div>
                  </th>

                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800 whitespace-nowrap"
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

                  <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
                          <Layers className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {leads.length === 0 ? 'Your CRM pipeline is empty' : 'No leads match your filter'}
                        </p>
                        <p className="text-slate-500 max-w-sm">
                          {leads.length === 0
                            ? 'Scan any live website URL to automatically add prospects, health scores, and cold pitch drafts.'
                            : 'Try clearing the search query or status filters to view all leads.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const currentTouchStep = lead.followUp?.currentTouchStep || 1;
                    const touchTitle =
                      currentTouchStep === 1
                        ? 'Touch 1 (Pitch)'
                        : currentTouchStep === 2
                        ? 'Follow-up #1'
                        : currentTouchStep === 3
                        ? 'Follow-up #2'
                        : 'Breakup';

                    const isMenuOpen = quickSendLeadId === lead.id;
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const isTagPopoverOpen = activeTagPopoverLeadId === lead.id;

                    return (
                      <tr
                        key={lead.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-orange-50/40 hover:bg-orange-50/60' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Checkbox Cell */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectLead(lead.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            aria-label={`Select ${lead.companyName}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Company & Domain */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-semibold text-slate-900 block font-heading whitespace-nowrap">
                              {lead.companyName}
                            </span>
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-500 hover:text-orange-600 font-mono inline-flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <span>{lead.url.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </td>

                        {/* Tags Cell with Add/Remove UI */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                            {lead.tags &&
                              lead.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-orange-50 text-orange-800 border border-orange-200/60 whitespace-nowrap"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(lead.id, tag)}
                                    className="hover:text-rose-600 transition-colors ml-0.5"
                                    title={`Remove tag ${tag}`}
                                    aria-label={`Remove tag ${tag}`}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}

                            {/* + Tag Popover Button */}
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTagPopoverLeadId(isTagPopoverOpen ? null : lead.id);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-dashed border-slate-300 hover:border-orange-400 text-slate-400 hover:text-orange-700 transition-colors whitespace-nowrap"
                                title="Add tag to prospect"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                <span>Tag</span>
                              </button>

                              {isTagPopoverOpen && (
                                <div
                                  ref={tagPopoverRef}
                                  className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-40 text-left animate-in fade-in zoom-in-95 font-sans"
                                >
                                  <div className="flex items-center gap-1 mb-2">
                                    <input
                                      type="text"
                                      placeholder="New tag..."
                                      value={newTagInput}
                                      onChange={(e) => setNewTagInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddTag(lead.id, newTagInput);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddTag(lead.id, newTagInput)}
                                      className="p-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[9px] font-mono uppercase text-slate-400">Suggestions:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {PRESET_TAGS.filter((pt) => !lead.tags?.includes(pt)).slice(0, 4).map((pt) => (
                                        <button
                                          key={pt}
                                          type="button"
                                          onClick={() => handleAddTag(lead.id, pt)}
                                          className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-700 transition-colors whitespace-nowrap"
                                        >
                                          + {pt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Industry */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {lead.industry}
                        </td>

                        {/* Audit Score */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs tabular-nums border ${getScoreColor(
                              lead.overallScore
                            )}`}
                          >
                            {lead.overallScore}/100
                          </span>
                        </td>

                        {/* Pipeline Stage Select */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                            className="text-xs font-mono py-1 px-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="audited">Audited</option>
                            <option value="drafted">Draft Ready</option>
                            <option value="contacted">Contacted</option>
                            <option value="replied">Replied</option>
                            <option value="converted">Converted</option>
                          </select>
                        </td>

                        {/* Follow-up Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-800 font-mono">
                              {touchTitle}
                            </span>
                            {lead.followUp?.lastProviderUsed ? (
                              <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" /> Sent via {EMAIL_PROVIDERS_META[lead.followUp.lastProviderUsed].shortName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Ready to dispatch
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date Scanned */}
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {formatAuditDate(lead.lastAuditedAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 relative">
                            {/* 1-Click Send Menu Button */}
                            <div className="relative" ref={isMenuOpen ? quickSendRef : undefined}>
                              <button
                                type="button"
                                onClick={() => setQuickSendLeadId(isMenuOpen ? null : lead.id)}
                                title="1-Click Send via Gmail, Outlook, Yahoo, or Custom Mail"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100/80 text-orange-900 text-xs font-medium transition-colors shadow-2xs whitespace-nowrap"
                              >
                                <Send className="h-3 w-3 text-orange-600" />
                                <span className="hidden sm:inline">Pitch</span>
                                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                              </button>

                              {/* Dropdown Options for the 4 Providers */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95">
                                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                                    Send {touchTitle} via:
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSend(lead, 'gmail')}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-slate-700 hover:text-red-700 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5 fill-current text-red-600 shrink-0" viewBox="0 0 24 24">
                                      <path d={EMAIL_PROVIDERS_META.gmail.iconSvg} />
                                    </svg>
                                    <span>Gmail</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickSend(lead, 'outlook')}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-sky-50 text-slate-700 hover:text-sky-700 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5 fill-current text-sky-600 shrink-0" viewBox="0 0 24 24">
                                      <path d={EMAIL_PROVIDERS_META.outlook.iconSvg} />
                                    </svg>
                                    <span>Outlook</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickSend(lead, 'yahoo')}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5 fill-current text-purple-600 shrink-0" viewBox="0 0 24 24">
                                      <path d={EMAIL_PROVIDERS_META.yahoo.iconSvg} />
                                    </svg>
                                    <span>Yahoo Mail</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickSend(lead, 'custom_smtp')}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-orange-50 text-slate-700 hover:text-orange-700 transition-colors border-t border-slate-100"
                                  >
                                    <Mail className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                                    <span>Custom Mail</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Vertical Ellipsis Actions Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuLeadId(activeActionMenuLeadId === lead.id ? null : lead.id);
                                  setQuickSendLeadId(null);
                                }}
                                title="Actions"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                aria-label="Lead actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {activeActionMenuLeadId === lead.id && (
                                <div
                                  ref={actionMenuRef}
                                  className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectLeadForAudit(lead);
                                      setActiveActionMenuLeadId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                                    <span>View Audit Scorecard</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectLeadForEmail(lead);
                                      setActiveActionMenuLeadId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  >
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Open Email Studio</span>
                                  </button>

                                  {onOpenTeaser && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenTeaser(lead);
                                        setActiveActionMenuLeadId(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                                      <span>Share Public Teaser</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteLead(lead.id);
                                      setActiveActionMenuLeadId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Delete Lead</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

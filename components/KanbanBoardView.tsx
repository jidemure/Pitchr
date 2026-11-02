'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Mail,
  Eye,
  Trash2,
  Send,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
  GripVertical,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Lead, LeadStatus, EmailProvider } from '@/lib/types';
import { formatAuditDate } from '@/lib/storage';
import { EMAIL_PROVIDERS_META } from '@/lib/emailDispatcher';

interface KanbanBoardViewProps {
  leads: Lead[];
  onSelectLeadForAudit: (lead: Lead) => void;
  onSelectLeadForEmail: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onQuickSend: (lead: Lead, provider: EmailProvider) => void;
}

interface ColumnDef {
  id: LeadStatus;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'audited',
    title: 'Audited',
    description: 'New audit ready',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    accentBorder: 'border-t-slate-400'
  },
  {
    id: 'drafted',
    title: 'Draft Ready',
    description: 'Pitch synthesized',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    accentBorder: 'border-t-blue-500'
  },
  {
    id: 'contacted',
    title: 'Contacted',
    description: 'Outreach dispatched',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    accentBorder: 'border-t-amber-500'
  },
  {
    id: 'replied',
    title: 'Replied',
    description: 'Warm prospect',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    accentBorder: 'border-t-indigo-500'
  },
  {
    id: 'converted',
    title: 'Converted',
    description: 'Meeting / Deal closed',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    accentBorder: 'border-t-emerald-500'
  }
];

const PROVIDER_OPTIONS: {
  id: EmailProvider;
  name: string;
  iconSvg?: string;
  colorClass: string;
  hoverClass: string;
}[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    iconSvg: EMAIL_PROVIDERS_META.gmail.iconSvg,
    colorClass: 'text-red-600',
    hoverClass: 'hover:bg-red-50 hover:text-red-700'
  },
  {
    id: 'outlook',
    name: 'Outlook',
    iconSvg: EMAIL_PROVIDERS_META.outlook.iconSvg,
    colorClass: 'text-sky-600',
    hoverClass: 'hover:bg-sky-50 hover:text-sky-700'
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    iconSvg: EMAIL_PROVIDERS_META.yahoo.iconSvg,
    colorClass: 'text-purple-600',
    hoverClass: 'hover:bg-purple-50 hover:text-purple-700'
  },
  {
    id: 'custom_smtp',
    name: 'Custom Mail',
    colorClass: 'text-emerald-600',
    hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700'
  }
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  leads,
  onSelectLeadForAudit,
  onSelectLeadForEmail,
  onUpdateLeadStatus,
  onDeleteLead,
  onQuickSend
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [activeMenuLeadId, setActiveMenuLeadId] = useState<string | null>(null);
  const [activeQuickSendLeadId, setActiveQuickSendLeadId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const quickSendRef = useRef<HTMLDivElement>(null);

  // Close card menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuLeadId(null);
      }
      if (quickSendRef.current && !quickSendRef.current.contains(event.target as Node)) {
        setActiveQuickSendLeadId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
    if (score >= 60) {
      return 'text-amber-700 bg-amber-50 border-amber-200';
    }
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: LeadStatus) => {
    // Only clear if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLeadStatus(leadId, targetStatus);
    }
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-4 pt-1">
      <div className="inline-flex items-start gap-4 min-w-full px-1">
        {COLUMNS.map((column) => {
          const columnLeads = leads.filter((l) => l.status === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl border transition-all duration-150 ${
                isOver
                  ? 'bg-orange-50/50 border-orange-400 ring-2 ring-orange-400/20 shadow-md'
                  : 'bg-slate-50/80 border-slate-200/90'
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3.5 border-b border-slate-200/70 bg-white rounded-t-2xl border-t-4 ${column.accentBorder} flex items-center justify-between gap-2`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-xs sm:text-sm font-heading truncate">
                      {column.title}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold tabular-nums ${column.badgeBg} ${column.badgeText}`}
                    >
                      {columnLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {column.description}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 flex-1 space-y-2.5 min-h-[360px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {columnLeads.length === 0 ? (
                  <div
                    className={`h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-colors ${
                      isOver
                        ? 'border-orange-400 bg-orange-100/30 text-orange-800'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-medium">No leads in {column.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {isOver ? 'Drop card here' : 'Drag prospects here to advance'}
                    </span>
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const isDragging = draggedLeadId === lead.id;
                    const cleanDomain = lead.url
                      .replace(/^https?:\/\//, '')
                      .replace(/^www\./, '')
                      .replace(/\/.*$/, '');

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'opacity-30 scale-95 border-dashed border-emerald-500'
                            : ''
                        }`}
                      >
                        {/* Card Header: Drag grip, Company name, and Score badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span
                              className="text-slate-300 group-hover:text-slate-500 transition-colors pt-0.5 shrink-0"
                              title="Drag to change stage"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onSelectLeadForAudit(lead)}
                                className="font-semibold text-slate-900 hover:text-orange-600 text-left text-xs sm:text-sm font-heading block truncate transition-colors"
                                title="Click to view full website audit report"
                              >
                                {lead.companyName}
                              </button>

                              <a
                                href={lead.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-mono text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 truncate max-w-[170px] transition-colors"
                              >
                                <span>{cleanDomain}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            </div>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums border shrink-0 ${getScoreBadge(
                              lead.overallScore
                            )}`}
                            title={`Audit health score: ${lead.overallScore}/100`}
                          >
                            {lead.overallScore}
                          </span>
                        </div>

                        {/* Card Metadata: Industry & Contact */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                          <span className="truncate max-w-[120px] text-slate-600 font-medium">
                            {lead.industry || 'Business'}
                          </span>

                          <span className="font-mono text-[10px] text-slate-400">
                            {formatAuditDate(lead.lastAuditedAt)}
                          </span>
                        </div>

                        {/* Contact Email line if available */}
                        {lead.contactEmail && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-500 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.contactEmail}</span>
                          </div>
                        )}

                        {/* Follow-up / Touch Step badge if tracked */}
                        {lead.followUp?.currentTouchStep && (
                          <div className="mt-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-500">
                              Touch #{lead.followUp.currentTouchStep}
                            </span>
                            {lead.followUp.lastProviderUsed && (
                              <span className="text-orange-600 font-medium capitalize">
                                {lead.followUp.lastProviderUsed}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action buttons row */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          {/* Quick Outreach Launcher */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQuickSendLeadId(
                                  activeQuickSendLeadId === lead.id ? null : lead.id
                                );
                                setActiveMenuLeadId(null);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200/80 text-[11px] font-medium transition-colors"
                              title="Launch 1-click email sequence"
                            >
                              <Send className="h-2.5 w-2.5" />
                              <span>Pitch</span>
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>

                            {/* Quick Send Provider Dropdown */}
                            {activeQuickSendLeadId === lead.id && (
                              <div
                                ref={quickSendRef}
                                className="absolute left-0 bottom-full mb-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                              >
                                <span className="block px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                  Select Provider
                                </span>
                                {PROVIDER_OPTIONS.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onQuickSend(lead, p.id);
                                      setActiveQuickSendLeadId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-700 transition-colors ${p.hoverClass}`}
                                  >
                                    {p.iconSvg ? (
                                      <svg
                                        className={`h-3.5 w-3.5 fill-current shrink-0 ${p.colorClass}`}
                                        viewBox="0 0 24 24"
                                      >
                                        <path d={p.iconSvg} />
                                      </svg>
                                    ) : (
                                      <Mail className={`h-3.5 w-3.5 shrink-0 ${p.colorClass}`} />
                                    )}
                                    <span className="truncate">{p.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectLeadForAudit(lead)}
                              title="View audit score & diagnosis"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectLeadForEmail(lead)}
                              title="Open Email Studio sequence"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>

                            {/* Stage Move Dropdown (for non-drag or mobile users) */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuLeadId(
                                    activeMenuLeadId === lead.id ? null : lead.id
                                  );
                                  setActiveQuickSendLeadId(null);
                                }}
                                title="Move stage or delete"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {activeMenuLeadId === lead.id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <span className="block px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                    Move to Stage
                                  </span>
                                  {COLUMNS.map((col) => (
                                    <button
                                      key={col.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateLeadStatus(lead.id, col.id);
                                        setActiveMenuLeadId(null);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                        lead.status === col.id
                                          ? 'bg-orange-50 text-orange-900 font-semibold'
                                          : 'text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{col.title}</span>
                                      {lead.status === col.id && (
                                        <Check className="h-3 w-3 text-orange-600" />
                                      )}
                                    </button>
                                  ))}

                                  <div className="pt-1 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteLead(lead.id);
                                        setActiveMenuLeadId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3 shrink-0" />
                                      <span>Delete Lead</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

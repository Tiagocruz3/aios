'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon,
  ZapIcon, AtomIcon, VideoIcon, GitBranchIcon, CloudIcon,
  LayersIcon, CalendarIcon, RotateCcwIcon, CheckIcon,
  StickyNoteIcon, BookOpenIcon, PackageIcon, BotIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── types ────────────────────────────────────────────────────────── */
export type ItemType = 'automation' | 'instruction' | 'content' | 'reminder'
export type AgentId  = 'helix' | 'hermes' | 'video' | 'git' | 'vercel' | 'hyperdrive' | 'none'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type ItemStatus  = 'pending' | 'done' | 'skipped'

export interface CalItem {
  id: string
  date: string        // YYYY-MM-DD
  title: string
  description: string
  type: ItemType
  agent: AgentId
  recurrence: Recurrence
  status: ItemStatus
  createdAt: number
}

type View = 'month' | 'week'

/* ── constants ───────────────────────────────────────────────────── */
const STORAGE_KEY = 'helix-calendar-items'

const AGENTS: { id: AgentId; label: string; icon: React.ElementType }[] = [
  { id: 'none',       label: 'No agent',    icon: CalendarIcon },
  { id: 'helix',      label: 'Helix Coder', icon: ZapIcon      },
  { id: 'hermes',     label: 'Hermes Chat', icon: AtomIcon     },
  { id: 'video',      label: 'Video Agent', icon: VideoIcon    },
  { id: 'git',        label: 'Git Manager', icon: GitBranchIcon},
  { id: 'vercel',     label: 'Vercel',      icon: CloudIcon    },
  { id: 'hyperdrive', label: 'Hyper Drive', icon: LayersIcon   },
]

const TYPES: { id: ItemType; label: string; color: string; dot: string; icon: React.ElementType }[] = [
  { id: 'automation', label: 'Automation',  color: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200',     dot: 'bg-cyan-400',   icon: BotIcon       },
  { id: 'instruction',label: 'Instruction', color: 'border-purple-400/50 bg-purple-400/10 text-purple-200', dot: 'bg-purple-400', icon: BookOpenIcon  },
  { id: 'content',    label: 'Content',     color: 'border-blue-400/50 bg-blue-400/10 text-blue-200',       dot: 'bg-blue-400',   icon: PackageIcon   },
  { id: 'reminder',   label: 'Reminder',    color: 'border-slate-400/40 bg-slate-400/8 text-slate-300',     dot: 'bg-slate-400',  icon: StickyNoteIcon},
]

const RECURRENCES: { id: Recurrence; label: string }[] = [
  { id: 'none',    label: 'One-off'  },
  { id: 'daily',   label: 'Daily'   },
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'monthly', label: 'Monthly' },
]

const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

/* ── helpers ─────────────────────────────────────────────────────── */
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function startOfMonth(y: number, m: number) { return new Date(y, m, 1) }

function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }

function typeStyle(t: ItemType) { return TYPES.find(x => x.id === t)! }

function agentDef(id: AgentId) { return AGENTS.find(a => a.id === id)! }

/* Expand recurring items across a year window so they appear on every relevant date */
function expandItems(items: CalItem[]): CalItem[] {
  const expanded: CalItem[] = []
  const windowStart = new Date(); windowStart.setFullYear(windowStart.getFullYear() - 1)
  const windowEnd   = new Date(); windowEnd.setFullYear(windowEnd.getFullYear() + 2)

  for (const item of items) {
    if (item.recurrence === 'none') { expanded.push(item); continue }
    const origin = new Date(item.date + 'T00:00:00')
    let cur = new Date(origin)
    while (cur <= windowEnd) {
      if (cur >= windowStart) {
        expanded.push({ ...item, id: `${item.id}-${toYMD(cur)}`, date: toYMD(cur) })
      }
      if (item.recurrence === 'daily')   cur.setDate(cur.getDate() + 1)
      else if (item.recurrence === 'weekly') cur.setDate(cur.getDate() + 7)
      else { cur.setMonth(cur.getMonth() + 1) }
    }
  }
  return expanded
}

/* ── blank form state ────────────────────────────────────────────── */
const blank = (date?: string): Omit<CalItem,'id'|'createdAt'> => ({
  date:        date ?? toYMD(new Date()),
  title:       '',
  description: '',
  type:        'automation',
  agent:       'none',
  recurrence:  'none',
  status:      'pending',
})

/* ═══════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════ */
export function HelixCalendar({ className }: { className?: string }) {
  const [items, setItems]       = useState<CalItem[]>([])
  const [view, setView]         = useState<View>('month')
  const [cursor, setCursor]     = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [weekBase, setWeekBase] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d })
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all')
  const [filterAgent, setFilterAgent] = useState<AgentId | 'all'>('all')

  // modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<CalItem | null>(null)
  const [form, setForm]           = useState<Omit<CalItem,'id'|'createdAt'>>(blank())
  const [detailItem, setDetailItem] = useState<CalItem | null>(null)

  const today = toYMD(new Date())

  /* persist */
  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setItems(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  /* expanded (recurring) view of all items */
  const allExpanded = expandItems(items)

  function itemsOn(date: string) {
    return allExpanded.filter(i => {
      if (i.date !== date) return false
      if (filterType  !== 'all' && i.type  !== filterType)  return false
      if (filterAgent !== 'all' && i.agent !== filterAgent) return false
      return true
    })
  }

  /* open create modal */
  function openCreate(date?: string) {
    setEditing(null)
    setForm(blank(date))
    setModalOpen(true)
  }

  /* open edit modal */
  function openEdit(item: CalItem) {
    // find the canonical base item (for recurring, strip the suffix)
    const baseId = item.id.includes('-2') ? item.id.split('-2')[0] : item.id
    const base = items.find(i => i.id === baseId) ?? item
    setEditing(base)
    setForm({ date: base.date, title: base.title, description: base.description,
              type: base.type, agent: base.agent, recurrence: base.recurrence, status: base.status })
    setDetailItem(null)
    setModalOpen(true)
  }

  function saveItem() {
    if (!form.title.trim()) return
    if (editing) {
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i))
    } else {
      setItems(prev => [...prev, { ...form, id: crypto.randomUUID(), createdAt: Date.now() }])
    }
    setModalOpen(false)
  }

  function deleteItem(id: string) {
    const baseId = id.includes('-2') ? id.split('-2')[0] : id
    setItems(prev => prev.filter(i => i.id !== baseId))
    setDetailItem(null)
    setModalOpen(false)
  }

  function toggleStatus(item: CalItem) {
    const baseId = item.id.includes('-2') ? item.id.split('-2')[0] : item.id
    setItems(prev => prev.map(i => i.id === baseId
      ? { ...i, status: i.status === 'done' ? 'pending' : 'done' }
      : i
    ))
  }

  /* nav */
  function prevMonth() { setCursor(c => c.m === 0 ? { y: c.y-1, m: 11 } : { y: c.y, m: c.m-1 }) }
  function nextMonth() { setCursor(c => c.m === 11 ? { y: c.y+1, m:  0 } : { y: c.y, m: c.m+1 }) }
  function prevWeek()  { setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n }) }
  function nextWeek()  { setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n }) }

  return (
    <div className={cn('flex flex-col h-full min-h-0 holo-surface', className)}>

      {/* ── toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/8 flex-shrink-0">

        {/* nav */}
        <div className="flex items-center gap-1">
          <button onClick={view === 'month' ? prevMonth : prevWeek}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-400/10 transition-all">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-mono font-semibold text-slate-100 min-w-[160px] text-center">
            {view === 'month'
              ? `${MONTHS[cursor.m]} ${cursor.y}`
              : `${weekBase.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${new Date(weekBase.getTime()+6*86400000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`
            }
          </span>
          <button onClick={view === 'month' ? nextMonth : nextWeek}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-400/10 transition-all">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); const s = new Date(d); s.setDate(d.getDate()-d.getDay()); setWeekBase(s) }}
            className="ml-1 px-2.5 h-7 rounded-md text-[11px] font-mono text-slate-500 border border-white/10 hover:text-cyan-200 hover:border-cyan-400/30 transition-all">
            Today
          </button>
        </div>

        {/* view toggle */}
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(['month','week'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 h-7 text-[11px] font-mono uppercase tracking-wider transition-all',
                view === v ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:text-slate-300')}>
              {v}
            </button>
          ))}
        </div>

        {/* type filter */}
        <div className="flex items-center gap-1">
          <button onClick={() => setFilterType('all')}
            className={cn('px-2.5 h-6 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all border',
              filterType === 'all' ? 'bg-white/10 border-white/20 text-slate-200' : 'border-white/8 text-slate-600 hover:text-slate-400')}>
            All
          </button>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setFilterType(filterType === t.id ? 'all' : t.id)}
              className={cn('flex items-center gap-1 px-2.5 h-6 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all border',
                filterType === t.id ? t.color + ' border-opacity-100' : 'border-white/8 text-slate-600 hover:text-slate-400')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />{t.label}
            </button>
          ))}
        </div>

        {/* agent filter */}
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value as AgentId | 'all')}
          className="h-7 px-2 rounded-md text-[11px] font-mono bg-black/40 border border-white/10 text-slate-400 focus:outline-none focus:border-cyan-400/30">
          <option value="all">All agents</option>
          {AGENTS.map(a => <option key={a.id} value={a.id} className="bg-[#0a0f16]">{a.label}</option>)}
        </select>

        <button onClick={() => openCreate()}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-200 text-xs font-mono font-semibold hover:bg-cyan-400/25 transition-all">
          <PlusIcon className="w-3.5 h-3.5" /> New item
        </button>
      </div>

      {/* ── calendar body ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {view === 'month'
          ? <MonthGrid cursor={cursor} today={today} itemsOn={itemsOn} onDayClick={openCreate} onItemClick={setDetailItem} />
          : <WeekGrid  weekBase={weekBase} today={today} itemsOn={itemsOn} onDayClick={openCreate} onItemClick={setDetailItem} />
        }
      </div>

      {/* ── detail popover ────────────────────────────────────────── */}
      {detailItem && (
        <DetailPopover item={detailItem} onClose={() => setDetailItem(null)}
          onEdit={() => openEdit(detailItem)}
          onToggle={() => { toggleStatus(detailItem); setDetailItem(null) }}
          onDelete={() => deleteItem(detailItem.id)} />
      )}

      {/* ── create / edit modal ───────────────────────────────────── */}
      {modalOpen && (
        <ItemModal
          form={form} editing={!!editing}
          onChange={f => setForm(prev => ({ ...prev, ...f }))}
          onSave={saveItem}
          onClose={() => setModalOpen(false)}
          onDelete={editing ? () => deleteItem(editing.id) : undefined}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Month grid
═══════════════════════════════════════════════════════════════════ */
function MonthGrid({ cursor, today, itemsOn, onDayClick, onItemClick }: {
  cursor: { y: number; m: number }
  today: string
  itemsOn: (d: string) => CalItem[]
  onDayClick: (d: string) => void
  onItemClick: (i: CalItem) => void
}) {
  const first = startOfMonth(cursor.y, cursor.m)
  const startOffset = first.getDay()
  const totalDays = daysInMonth(cursor.y, cursor.m)
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="p-3">
      {/* day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-mono text-slate-600 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>
      {/* cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="min-h-[90px]" />
          const ymd = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const its = itemsOn(ymd)
          const isToday = ymd === today
          return (
            <div key={idx}
              onClick={() => onDayClick(ymd)}
              className={cn(
                'min-h-[90px] rounded-lg border p-1.5 flex flex-col gap-1 cursor-pointer transition-all group',
                isToday ? 'border-cyan-400/40 bg-cyan-400/[0.05]' : 'border-white/6 hover:border-cyan-400/20 hover:bg-white/[0.015]'
              )}>
              <span className={cn('text-[11px] font-mono self-start w-6 h-6 flex items-center justify-center rounded-full',
                isToday ? 'bg-cyan-400 text-black font-bold' : 'text-slate-500 group-hover:text-slate-300')}>
                {day}
              </span>
              {its.slice(0, 3).map(item => (
                <ItemChip key={item.id} item={item} onClick={e => { e.stopPropagation(); onItemClick(item) }} />
              ))}
              {its.length > 3 && (
                <span className="text-[9px] font-mono text-slate-600 pl-0.5">+{its.length - 3} more</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Week grid
═══════════════════════════════════════════════════════════════════ */
function WeekGrid({ weekBase, today, itemsOn, onDayClick, onItemClick }: {
  weekBase: Date
  today: string
  itemsOn: (d: string) => CalItem[]
  onDayClick: (d: string) => void
  onItemClick: (i: CalItem) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekBase); d.setDate(weekBase.getDate() + i); return d
  })

  return (
    <div className="p-3 grid grid-cols-7 gap-2 h-full min-h-[500px]">
      {days.map(d => {
        const ymd = toYMD(d)
        const its = itemsOn(ymd)
        const isToday = ymd === today
        return (
          <div key={ymd} onClick={() => onDayClick(ymd)}
            className={cn('rounded-xl border flex flex-col gap-2 p-2.5 cursor-pointer transition-all',
              isToday ? 'border-cyan-400/40 bg-cyan-400/[0.05]' : 'border-white/6 hover:border-cyan-400/20 hover:bg-white/[0.015]')}>
            <div className="flex flex-col items-center gap-0.5 pb-2 border-b border-white/6">
              <span className="text-[10px] font-mono text-slate-600 uppercase">{DAYS[d.getDay()]}</span>
              <span className={cn('text-lg font-mono tabular-nums w-9 h-9 flex items-center justify-center rounded-full',
                isToday ? 'bg-cyan-400 text-black font-bold' : 'text-slate-300')}>
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              {its.map(item => (
                <ItemChip key={item.id} item={item} full onClick={e => { e.stopPropagation(); onItemClick(item) }} />
              ))}
              {its.length === 0 && (
                <span className="text-[10px] font-mono text-slate-700 text-center mt-2">—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Item chip (compact label) ───────────────────────────────────── */
function ItemChip({ item, full, onClick }: { item: CalItem; full?: boolean; onClick: (e: React.MouseEvent) => void }) {
  const ts = typeStyle(item.type)
  const AgentIcon = agentDef(item.agent).icon
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-1 text-left rounded px-1.5 py-0.5 border text-[10px] font-mono truncate transition-all hover:brightness-125 w-full',
        ts.color,
        item.status === 'done' && 'opacity-50 line-through')}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', ts.dot)} />
      {full && item.agent !== 'none' && <AgentIcon className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
      <span className="truncate">{item.title}</span>
      {item.recurrence !== 'none' && <RotateCcwIcon className="w-2.5 h-2.5 flex-shrink-0 opacity-40 ml-auto" />}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Detail popover
═══════════════════════════════════════════════════════════════════ */
function DetailPopover({ item, onClose, onEdit, onToggle, onDelete }: {
  item: CalItem
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const ts = typeStyle(item.type)
  const agent = agentDef(item.agent)
  const AgentIcon = agent.icon
  const TypeIcon  = ts.icon

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={cn('relative z-10 w-full max-w-sm rounded-2xl border bg-[#0a1525]/95 backdrop-blur-xl p-5 shadow-[0_0_40px_-8px_rgba(0,200,255,0.3)] flex flex-col gap-4', ts.color.split(' ')[0])}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg border', ts.color)}>
              <TypeIcon className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-mono font-semibold text-slate-100">{item.title}</p>
              <p className="text-[10px] font-mono text-slate-500">{item.date} · {ts.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {item.description && (
          <p className="text-xs font-mono text-slate-400 leading-relaxed bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/6">
            {item.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {item.agent !== 'none' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-400">
              <AgentIcon className="w-3 h-3 text-cyan-400" /> {agent.label}
            </span>
          )}
          {item.recurrence !== 'none' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-400">
              <RotateCcwIcon className="w-3 h-3" /> {RECURRENCES.find(r => r.id === item.recurrence)?.label}
            </span>
          )}
          <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-mono border',
            item.status === 'done' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-slate-500')}>
            {item.status}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-white/6">
          <button onClick={onToggle}
            className={cn('flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-mono font-semibold border transition-all',
              item.status === 'done'
                ? 'border-slate-400/30 bg-slate-400/10 text-slate-300 hover:bg-slate-400/20'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20')}>
            <CheckIcon className="w-3.5 h-3.5" />
            {item.status === 'done' ? 'Mark pending' : 'Mark done'}
          </button>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-mono font-semibold border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 transition-all">
            Edit
          </button>
          <button onClick={onDelete}
            className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Create / Edit modal
═══════════════════════════════════════════════════════════════════ */
function ItemModal({ form, editing, onChange, onSave, onClose, onDelete }: {
  form: Omit<CalItem,'id'|'createdAt'>
  editing: boolean
  onChange: (f: Partial<Omit<CalItem,'id'|'createdAt'>>) => void
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
}) {
  const inputCls = 'w-full h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40'
  const labelCls = 'text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 block'
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-cyan-400/20 bg-[#08111f]/98 backdrop-blur-xl shadow-[0_0_60px_-12px_rgba(0,200,255,0.25)] p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}>

        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
            <span className="text-sm font-mono font-bold text-cyan-200 uppercase tracking-wider">
              {editing ? 'Edit item' : 'New calendar item'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* type selector */}
        <div>
          <label className={labelCls}>Type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} type="button" onClick={() => onChange({ type: t.id })}
                  className={cn('flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[10px] font-mono transition-all',
                    form.type === t.id ? t.color : 'border-white/8 text-slate-600 hover:text-slate-400 hover:border-white/15')}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* title */}
        <div>
          <label className={labelCls}>Title *</label>
          <input ref={firstRef} value={form.title} onChange={e => onChange({ title: e.target.value })}
            placeholder={form.type === 'automation' ? 'e.g. Generate 3 Shorts every Monday' : 'Item title'}
            className={inputCls} />
        </div>

        {/* description */}
        <div>
          <label className={labelCls}>Instructions / notes</label>
          <textarea value={form.description} onChange={e => onChange({ description: e.target.value })}
            rows={3}
            placeholder={form.type === 'automation'
              ? 'Full prompt or instructions for the agent…'
              : form.type === 'instruction' ? 'Standing instruction or prompt template…' : 'Details…'}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40 resize-none leading-relaxed" />
        </div>

        {/* row: date + recurrence */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={form.date} onChange={e => onChange({ date: e.target.value })}
              className={inputCls + ' [color-scheme:dark]'} />
          </div>
          <div>
            <label className={labelCls}>Recurrence</label>
            <select value={form.recurrence} onChange={e => onChange({ recurrence: e.target.value as Recurrence })}
              className={inputCls + ' cursor-pointer'}>
              {RECURRENCES.map(r => <option key={r.id} value={r.id} className="bg-[#08111f]">{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* row: agent + status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Agent</label>
            <select value={form.agent} onChange={e => onChange({ agent: e.target.value as AgentId })}
              className={inputCls + ' cursor-pointer'}>
              {AGENTS.map(a => <option key={a.id} value={a.id} className="bg-[#08111f]">{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => onChange({ status: e.target.value as ItemStatus })}
              className={inputCls + ' cursor-pointer'}>
              <option value="pending" className="bg-[#08111f]">Pending</option>
              <option value="done"    className="bg-[#08111f]">Done</option>
              <option value="skipped" className="bg-[#08111f]">Skipped</option>
            </select>
          </div>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/6">
          {onDelete && (
            <button onClick={onDelete}
              className="h-9 px-3 rounded-lg text-[11px] font-mono border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all">
              Delete
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto h-9 px-4 rounded-lg text-[11px] font-mono border border-white/10 text-slate-400 hover:text-slate-200 transition-all">
            Cancel
          </button>
          <button onClick={onSave} disabled={!form.title.trim()}
            className={cn('h-9 px-5 rounded-lg text-[11px] font-mono font-bold transition-all',
              form.title.trim()
                ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_20px_-4px_rgba(0,200,255,0.6)]'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed')}>
            {editing ? 'Save changes' : 'Add to calendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

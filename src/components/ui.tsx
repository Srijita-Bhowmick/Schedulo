import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, Check, ChevronDown, CircleAlert, LoaderCircle } from 'lucide-react'

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('brand-lockup', compact && 'brand-lockup--compact')}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="brand-wordmark">Schedulo</span>}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'dark' | 'light' | 'mist' | 'ember' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  loading?: boolean
}

export function Button({ tone = 'dark', size = 'md', icon: Icon, loading, className, children, ...props }: ButtonProps) {
  return (
    <button className={cn('button', `button--${tone}`, `button--${size}`, className)} {...props}>
      {loading ? <LoaderCircle size={15} className="spin" /> : Icon && <Icon size={15} strokeWidth={1.8} />}
      <span>{children}</span>
    </button>
  )
}

export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: 'neutral' | 'mist' | 'ember' | 'dark'; dot?: boolean }) {
  return (
    <span className={cn('badge', `badge--${tone}`)}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}

export function StatusPill({ children, tone = 'mist', icon: Icon = Check }: { children: ReactNode; tone?: 'mist' | 'ember' | 'dark'; icon?: LucideIcon }) {
  return (
    <span className={cn('status-pill', `status-pill--${tone}`)}>
      <Icon size={13} strokeWidth={2.2} />
      {children}
    </span>
  )
}

export function Surface({ children, className, dark = false, style }: { children: ReactNode; className?: string; dark?: boolean; style?: React.CSSProperties }) {
  return <section className={cn('surface', dark && 'surface--dark', className)} style={style}>{children}</section>
}

export function SectionLabel({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return (
    <div className="section-label">
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <h2>{children}</h2>
    </div>
  )
}

export function Field({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn('field', className)}>
      <span className="field-label">{label}</span>
      <input {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function SelectField({ label, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn('field', className)}>
      <span className="field-label">{label}</span>
      <span className="select-wrap">
        <select {...props}>{children}</select>
        <ChevronDown size={15} />
      </span>
    </label>
  )
}

export function EmptyState({ icon: Icon = CircleAlert, title, body }: { icon?: LucideIcon; title: string; body: string }) {
  return (
    <div className="empty-state">
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  )
}

export function InlineArrow() {
  return <ArrowUpRight size={15} strokeWidth={1.7} />
}

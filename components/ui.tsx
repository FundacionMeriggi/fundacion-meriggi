'use client';

import { X } from 'lucide-react';

export function PageHead({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="actions">{actions}</div>}</header>;
}

export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><strong>{title}</strong><span>{text}</span></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-head"><div><span className="eyebrow">Fundación Meriggi</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-body">{children}</div></div></div>;
}

export function Toast({ text }: { text: string }) {
  return <div className="toast">{text}</div>;
}

export function Loader() {
  return <div className="loading"><div><div className="spinner" />Cargando información segura…</div></div>;
}

/** 'just now', '5 min ago', '3 h ago', 'yesterday', '4 d ago', then a plain dd/MM/yyyy date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} d ago`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(then.getDate())}/${pad(then.getMonth() + 1)}/${then.getFullYear()}`;
}

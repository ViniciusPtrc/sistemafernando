import type { StatusConta } from '@/types';
import { STATUS_DOT, STATUS_LABELS, STATUS_STYLES } from '@/utils/status';

export function StatusBadge({ status }: { status: StatusConta }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

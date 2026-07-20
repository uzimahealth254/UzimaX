interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  /** Hide this column in the mobile card list */
  hideOnMobile?: boolean;
  /** Emphasize on mobile (shown first / larger) */
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  /** Optional stable row key */
  getRowKey?: (item: T, index: number) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  getRowKey,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="surface-card text-center py-14 px-4 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const mobileCols = columns.filter((c) => !c.hideOnMobile);
  const primaryCols = mobileCols.filter((c) => c.primary);
  const secondaryCols = mobileCols.filter((c) => !c.primary);

  return (
    <div className="surface-card overflow-hidden">
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-border/50">
        {data.map((item, idx) => {
          const key = getRowKey?.(item, idx) ?? idx;
          const primary = primaryCols.length ? primaryCols : mobileCols.slice(0, 1);
          const rest = primaryCols.length ? secondaryCols : mobileCols.slice(1);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onRowClick?.(item)}
              className={`w-full text-left p-4 space-y-2.5 transition-colors active:bg-primary/[0.05] ${onRowClick ? '' : 'cursor-default'}`}
              disabled={!onRowClick}
            >
              {primary.map((col) => (
                <div key={col.key} className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{col.header}</p>
                  <div className="text-sm font-medium break-words">{col.render(item)}</div>
                </div>
              ))}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                  {rest.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">{col.header}</p>
                      <div className="text-xs mt-0.5 break-words">{col.render(item)}</div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block overflow-x-auto scroll-touch -mx-px">
        <table className="data-table min-w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const key = getRowKey?.(item, idx) ?? idx;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>{col.render(item)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

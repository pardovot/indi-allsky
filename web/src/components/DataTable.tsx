import { ReactNode, useMemo, useState } from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  searchValue?: (row: T) => string | null | undefined;
  right?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  searchable?: boolean;
  searchPlaceholder?: string;
  empty?: ReactNode;
  /** Extra content rendered between toolbar and table (e.g. helper text) */
  toolbarRight?: ReactNode;
  /** Optional row count display in toolbar */
  showCount?: boolean;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  defaultSort,
  searchable = true,
  searchPlaceholder = 'Filter…',
  empty = 'No data',
  toolbarRight,
  showCount = true,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    defaultSort ?? null,
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => {
        const v = c.searchValue ? c.searchValue(r) : String(c.render(r) ?? '');
        return v != null && String(v).toLowerCase().includes(s);
      }),
    );
  }, [rows, columns, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col || !col.sortValue) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
  }, [filtered, sort, columns]);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col || !col.sortValue) return;
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  return (
    <div className="space-y-3">
      {(searchable || toolbarRight || showCount) && (
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {showCount && (
            <div className="text-ink-dim">
              <span className="text-ink-bright font-mono">{sorted.length}</span>
              {sorted.length !== rows.length && (
                <> / <span className="font-mono">{rows.length}</span></>
              )}
              <span className="ml-1">rows</span>
            </div>
          )}
          <div className="flex-1" />
          {toolbarRight}
          {searchable && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-56"
            />
          )}
        </div>
      )}

      <div className="bg-bg-1 border border-edge rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              {columns.map((c) => {
                const sortable = !!c.sortValue;
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    className={[
                      'px-3 py-1.5 whitespace-nowrap select-none',
                      c.right ? 'text-right' : 'text-left',
                      sortable ? 'cursor-pointer hover:text-ink' : '',
                      active ? 'text-ink-bright' : '',
                    ].join(' ')}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.label}
                    {sortable && (
                      <span className="ml-1 opacity-60">
                        {active ? (sort!.dir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-4 text-center text-ink-dim"
                >
                  {empty}
                </td>
              </tr>
            ) : sorted.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-edge hover:bg-bg-2 transition-colors"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      'px-3 py-1.5 whitespace-nowrap',
                      c.right ? 'text-right' : 'text-left',
                    ].join(' ')}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Format an ISO timestamp as "YYYY-MM-DD HH:MM:SS" (local). */
export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

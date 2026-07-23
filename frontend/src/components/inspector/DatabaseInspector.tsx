import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDbTable } from '@/api/worker'
import { Database, RefreshCw, Search } from 'lucide-react'

const TABLES = ['customers', 'voice_calls', 'conversation_logs', 'insurance_quotes', 'lead_scores', 'appointments', 'callbacks']

export function DatabaseInspector() {
  const [activeTable, setActiveTable] = useState(TABLES[0])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['db', activeTable, page, search],
    queryFn: () => fetchDbTable(activeTable, page, 50, search),
    refetchInterval: 5000,
  })

  const columns = data?.rows?.[0] ? Object.keys(data.rows[0]) : []

  const handleTableChange = (t: string) => {
    setActiveTable(t)
    setPage(1)
    setSearch('')
    setSearchInput('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-card/50">
        <Database size={16} className="text-accent" />
        <span className="text-sm font-semibold text-text-primary">Database Inspector</span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto p-1.5 rounded-lg hover:bg-bg-surface transition-colors text-text-muted"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin text-accent' : ''} />
        </button>
      </div>

      <div className="flex gap-1 px-4 py-2 border-b border-border overflow-x-auto scrollbar-none">
        {TABLES.map((t) => (
          <button
            key={t}
            onClick={() => handleTableChange(t)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${activeTable === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <Search size={13} className="text-text-muted flex-shrink-0" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search rows..."
          className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
        />
      </form>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">Loading...</div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-32 text-red-400 text-sm">Failed to load table</div>
        )}
        {data && columns.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-card border-b border-border">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-left text-text-muted font-medium whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bg-surface/50 transition-colors">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2 text-text-primary whitespace-nowrap max-w-[160px] truncate">
                      {String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.rows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">No rows found</div>
        )}
      </div>

      {data && data.total > 50 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
          <span>{data.total} total rows</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded hover:bg-bg-surface disabled:opacity-30">←</button>
            <span>Page {page}</span>
            <button disabled={page * 50 >= data.total} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded hover:bg-bg-surface disabled:opacity-30">→</button>
          </div>
        </div>
      )}
    </div>
  )
}

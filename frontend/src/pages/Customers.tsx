import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { fetchDbTable } from '@/api/worker'
import { Search, Users } from 'lucide-react'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

export function Customers() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['db', 'customers', page, search],
    queryFn: () => fetchDbTable('customers', page, 20, search),
    refetchInterval: 10000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-bg-card/50">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-accent" />
          <h1 className="text-base font-bold text-text-primary">Customers</h1>
        </div>
        {data && <span className="text-xs text-text-muted">{data.total} total</span>}
        <form onSubmit={handleSearch} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border">
          <Search size={13} className="text-text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search customers..."
            className="bg-transparent text-sm text-text-primary placeholder-text-muted outline-none w-48"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-6"><LoadingSkeleton lines={8} /></div>}
        {data && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-card border-b border-border">
              <tr>
                {['Phone', 'Name', 'City', 'Age', 'Budget', 'Coverage', 'Insurer', 'Timeline'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-bg-surface/40 transition-colors">
                  <td className="px-4 py-2.5 text-text-muted font-mono text-xs">{String(row.phone || '—')}</td>
                  <td className="px-4 py-2.5 text-text-primary font-medium">{String(row.name || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted">{String(row.city || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted">{String(row.age || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted">{String(row.budget || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted max-w-[120px] truncate">{String(row.coverage_needed || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted">{String(row.existing_insurer || '—')}</td>
                  <td className="px-4 py-2.5 text-text-muted">{String(row.buying_timeline || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.rows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">No customers found</div>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-text-muted">
          <span>Page {page} · {data.total} total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg hover:bg-bg-surface disabled:opacity-30">Previous</button>
            <button disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg hover:bg-bg-surface disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

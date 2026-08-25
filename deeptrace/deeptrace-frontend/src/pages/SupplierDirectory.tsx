import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SupplierDirectoryItem } from '../api/types';
import { TopBar } from '../components/layout/TopBar';
import { formatCurrency } from '../utils/format';
import { Search } from 'lucide-react';

export const SupplierDirectory: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getSuppliers()
      .then(res => {
        setSuppliers(res.suppliers);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">Supplier Directory</h1>
            <div className="relative w-64">
              <input 
                type="text" 
                placeholder="Search suppliers..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-[var(--color-border)] rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-border)]"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white border border-[var(--color-border)] rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium text-right">Revenue Exposure</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-center">Data Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-secondary)]">Loading directory...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-secondary)]">No suppliers found.</td>
                  </tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">{s.name}</td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono text-xs">{s.id}</td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{s.country}</td>
                    <td className="px-6 py-4 text-[var(--color-text-primary)] text-right font-medium">
                      {s.revenue_usd ? formatCurrency(s.revenue_usd) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.status === 'At risk' ? 'bg-[var(--color-risk-bg)] text-[var(--color-risk)]' : 'bg-green-100 text-green-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                        {s.data_source === 'erp_direct' ? 'ERP' : 'Demo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

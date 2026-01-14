import React from 'react';
import { db } from '../services/instantdb';

const OWNER_PIN = '7777'; // Change this to your secret owner PIN

export const OwnerDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isLoading, error, data } = db.useQuery({ pools: {} });

  const pools = data?.pools || [];
  const totalPools = pools.length;
  const totalRevenue = totalPools * 5; // $5 per pool
  const totalSquaresClaimed = pools.reduce((sum, p) => sum + (p.squaresClaimed || 0), 0);
  const totalPot = pools.reduce((sum, p) => sum + (p.totalPot || 0), 0);

  const sortedPools = [...pools].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-4xl bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Owner Dashboard</h2>
            <p className="text-neutral-500 text-sm">Sunday Squares Analytics</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Pools</p>
            <p className="text-3xl font-black text-white">{totalPools}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">Revenue</p>
            <p className="text-3xl font-black text-white">${totalRevenue}</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
            <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-1">Squares Claimed</p>
            <p className="text-3xl font-black text-white">{totalSquaresClaimed}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Pot Value</p>
            <p className="text-3xl font-black text-white">${totalPot}</p>
          </div>
        </div>

        {/* Pools Table */}
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-white font-bold uppercase tracking-widest text-xs">All Pools</h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading pools...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">Error loading pools</div>
          ) : pools.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No pools created yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Pool Code</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Title</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Created</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Squares</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Pot</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPools.map((pool) => (
                    <tr key={pool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-emerald-400 font-mono font-bold">{pool.poolCode}</span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{pool.title}</td>
                      <td className="px-4 py-3 text-neutral-400 text-sm">
                        {pool.createdAt ? new Date(pool.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-bold">{pool.squaresClaimed || 0}</span>
                        <span className="text-neutral-500">/100</span>
                      </td>
                      <td className="px-4 py-3 text-white font-bold">${pool.totalPot || 0}</td>
                      <td className="px-4 py-3">
                        {pool.isLocked ? (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded-lg">Locked</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-lg">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { OWNER_PIN };

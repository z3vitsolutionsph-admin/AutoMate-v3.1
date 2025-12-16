
import React, { useState } from 'react';
import { Settings as SettingsIcon, Link2, RefreshCw, CheckCircle2, XCircle, Activity, FileText, Globe, Shield, Github } from 'lucide-react';
import { IntegrationConfig, SyncLog } from '../types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users'>('integrations');
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    { id: '1', provider: 'QUICKBOOKS', name: 'QuickBooks Online', status: 'DISCONNECTED', autoSync: false },
    { id: '2', provider: 'XERO', name: 'Xero Accounting', status: 'CONNECTED', lastSync: new Date(), autoSync: true },
    { id: '3', provider: 'GITHUB', name: 'GitHub Repository', status: 'DISCONNECTED', autoSync: false },
  ]);

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([
    { id: '1', provider: 'XERO', action: 'Daily Sales Sync', status: 'SUCCESS', timestamp: new Date(), details: 'Synced 45 transactions.' },
    { id: '2', provider: 'XERO', action: 'Inventory Level Sync', status: 'FAILURE', timestamp: new Date(Date.now() - 86400000), details: 'API Rate Limit Exceeded.' },
  ]);

  const toggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        return { 
          ...int, 
          status: int.status === 'CONNECTED' ? 'DISCONNECTED' : 'SYNCING' 
        };
      }
      return int;
    }));

    // Simulate connection process
    const target = integrations.find(i => i.id === id);
    if (target && target.status !== 'CONNECTED') {
      setTimeout(() => {
        setIntegrations(prev => prev.map(int => {
          if (int.id === id) return { ...int, status: 'CONNECTED', lastSync: new Date() };
          return int;
        }));
        
        // Add a simulation log for GitHub if connected
        if (target.provider === 'GITHUB') {
            setSyncLogs(prev => [{
                id: Date.now().toString(),
                provider: 'GITHUB',
                action: 'Repository Backup',
                status: 'SUCCESS',
                timestamp: new Date(),
                details: 'Automated backup of inventory data committed to main branch.'
            }, ...prev]);
        }
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="text-slate-400" /> Settings & Integrations
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage external connections, accounting software, and system preferences.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-6">
        <button 
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'integrations' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Accounting Integrations
        </button>
        <button 
           onClick={() => setActiveTab('general')}
           className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'general' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          General & Regional
        </button>
        <button 
           onClick={() => setActiveTab('users')}
           className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          User Roles
        </button>
      </div>

      {/* Content */}
      <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Providers List */}
            <div className="lg:col-span-2 space-y-4">
              {integrations.map(integration => (
                <div key={integration.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                        integration.provider === 'QUICKBOOKS' ? 'bg-green-600 text-white' : 
                        integration.provider === 'GITHUB' ? 'bg-slate-800 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                      {integration.provider === 'QUICKBOOKS' ? 'qb' : 
                       integration.provider === 'GITHUB' ? <Github size={28} /> : 
                       'X'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{integration.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          integration.status === 'CONNECTED' ? 'bg-emerald-500' : 
                          integration.status === 'SYNCING' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-600'
                        }`}></span>
                        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">{integration.status}</span>
                      </div>
                      {integration.lastSync && (
                        <p className="text-xs text-slate-500 mt-1">Last synced: {integration.lastSync.toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <button className="text-slate-400 hover:text-white p-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors" title="Settings">
                       <SettingsIcon size={18} />
                     </button>
                     <button 
                      onClick={() => toggleConnection(integration.id)}
                      className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg ${
                        integration.status === 'CONNECTED' 
                          ? 'bg-slate-800 text-rose-400 border border-slate-700 hover:bg-slate-700' 
                          : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-900/20'
                      }`}
                     >
                       {integration.status === 'CONNECTED' ? 'Disconnect' : integration.status === 'SYNCING' ? 'Connecting...' : 'Connect'}
                     </button>
                  </div>
                </div>
              ))}

              <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-500">
                <Globe className="mx-auto mb-2 opacity-50" size={32} />
                <p>More integrations (Shopify, Lazada, Shopee) coming soon.</p>
              </div>
            </div>

            {/* Sync Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-fit">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" /> Sync Logs
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {syncLogs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm pb-3 border-b border-slate-800 last:border-0">
                    <div className={`mt-1 ${log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {log.status === 'SUCCESS' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{log.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{log.provider} • {log.timestamp.toLocaleTimeString()}</div>
                      <div className="text-xs text-slate-400 mt-1 bg-slate-950 p-1.5 rounded border border-slate-800 font-mono">
                        {log.details}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GENERAL TAB Placeholder */}
        {activeTab === 'general' && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white">Regional Settings</h3>
            <p className="text-slate-400 mt-2">Configure currency, timezone (Asia/Manila), and tax rates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

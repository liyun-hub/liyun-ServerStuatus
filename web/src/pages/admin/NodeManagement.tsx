import { useEffect, useState } from 'react';
import { getAdminNodes, addNode, updateNodeDisplayName, resetNodeToken, getNodeInstallCommand } from '../../api';
import { Server, Plus, Edit2, RefreshCw, Terminal, Check, X, Shield, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function NodeManagement() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals/Dialogs state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [installCmd, setInstallCmd] = useState<string | null>(null);
  
  // Form state
  const [newNodeName, setNewNodeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchNodes = async () => {
    try {
      const data = await getAdminNodes();
      setNodes(data || []);
    } catch (err) {
      // handled globally or skip
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await addNode({ displayName: newNodeName });
      setNewToken(data.token);
      setNewNodeName('');
      fetchNodes();
    } catch (err) {
      alert('Failed to add node');
    }
  };

  const handleSaveName = async (id: string) => {
    try {
      await updateNodeDisplayName(id, editName);
      setEditingId(null);
      fetchNodes();
    } catch (err) {
      alert('Failed to update name');
    }
  };

  const handleResetToken = async (id: string) => {
    if (!confirm('Are you sure? The agent will lose connection until updated with the new token.')) return;
    try {
      const data = await resetNodeToken(id);
      setNewToken(data.token);
    } catch (err) {
      alert('Failed to reset token');
    }
  };

  const handleGetInstallCommand = async (id: string) => {
    if (!confirm('This will generate a new token for the node and disconnect the current agent. Proceed?')) return;
    try {
      const data = await getNodeInstallCommand(id);
      setInstallCmd(data.command);
      setNewToken(data.token);
    } catch (err) {
      alert('Failed to get install command');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            {t('admin.nodeMgmtTitle')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('admin.nodeMgmtSub')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.addNode')}
        </button>
      </div>

      {(newToken || installCmd) && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex justify-between">
            <h3 className="text-sm font-medium text-green-800">Credentials Generated</h3>
            <button onClick={() => { setNewToken(null); setInstallCmd(null); }} className="text-green-500 hover:text-green-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 text-sm text-green-700 space-y-4">
            <p className="font-bold">{t('admin.tokenWarning')}</p>
            
            {newToken && (
              <div>
                <p className="mb-1">Agent Token:</p>
                <div className="flex items-center gap-2 bg-green-100 p-2 rounded">
                  <code className="break-all">{newToken}</code>
                  <button onClick={() => copyToClipboard(newToken)} className="p-1 hover:bg-green-200 rounded" title={t('common.copy')}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {installCmd && (
              <div>
                <p className="mb-1">{t('admin.installCmdDesc')}</p>
                <div className="flex items-center gap-2 bg-green-100 p-2 rounded">
                  <code className="break-all">{installCmd}</code>
                  <button onClick={() => copyToClipboard(installCmd)} className="p-1 hover:bg-green-200 rounded" title={t('common.copy')}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.addNode')}</h3>
          <form onSubmit={handleAddNode} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.displayName')}</label>
              <input
                type="text"
                id="displayName"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="e.g. Web Server 01"
              />
            </div>
            <button type="submit" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              Create
            </button>
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              {t('common.cancel')}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
        <ul className="divide-y divide-gray-200">
          {nodes.map((node) => (
            <li key={node.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className={`h-5 w-5 ${node.online ? 'text-green-500' : 'text-gray-400'}`} />
                    
                    {editingId === node.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
                        />
                        <button onClick={() => handleSaveName(node.id)} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4"/></button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-blue-600 truncate">{node.displayName || node.hostname || 'Unnamed Node'}</p>
                          <button onClick={() => { setEditingId(node.id); setEditName(node.displayName || ''); }} className="text-gray-400 hover:text-gray-600" title={t('admin.edit')}>
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">ID: {node.id}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResetToken(node.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      title={t('admin.resetToken')}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Token
                    </button>
                    <button
                      onClick={() => handleGetInstallCommand(node.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      title={t('admin.installCmd')}
                    >
                      <Terminal className="h-3 w-3 mr-1" /> Cmd
                    </button>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Added {format(node.createdAt * 1000, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>
                      {t('dashboard.lastSeen')}: {node.lastSeenAt ? format(node.lastSeenAt * 1000, 'MMM d, HH:mm') : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {nodes.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-500">
              No nodes configured yet. Add your first node to get started.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

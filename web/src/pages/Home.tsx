import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNodes } from '../api';
import { Server, CheckCircle, XCircle, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await getNodes();
        setNodes(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load nodes');
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
    const interval = setInterval(fetchNodes, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && nodes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && nodes.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <Link
            key={node.id}
            to={`/nodes/${node.id}`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-gray-100"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-gray-400" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">{node.displayName || node.hostname}</p>
                    <p className="text-xs text-gray-500 truncate">{node.ip}</p>
                  </div>
                </div>
                <div>
                  {node.online ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      {t('dashboard.online')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                      <XCircle className="h-3 w-3" />
                      {t('dashboard.offline')}
                    </span>
                  )}
                </div>
              </div>
              
              {node.latest && (
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div className="flex flex-col items-center">
                    <Cpu className="h-4 w-4 text-blue-500 mb-1" />
                    <span className="text-sm font-semibold text-gray-900">{node.latest.cpuUsage.toFixed(1)}%</span>
                    <span className="text-xs text-gray-500">{t('dashboard.cpu')}</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-r border-gray-100">
                    <MemoryStick className="h-4 w-4 text-purple-500 mb-1" />
                    <span className="text-sm font-semibold text-gray-900">{node.latest.memoryUsage.toFixed(1)}%</span>
                    <span className="text-xs text-gray-500">{t('dashboard.memory')}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <HardDrive className="h-4 w-4 text-amber-500 mb-1" />
                    <span className="text-sm font-semibold text-gray-900">{node.latest.diskUsage.toFixed(1)}%</span>
                    <span className="text-xs text-gray-500">{t('dashboard.disk')}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                {t('dashboard.lastSeen')}: {node.lastSeenAt ? formatDistanceToNow(node.lastSeenAt * 1000, { addSuffix: true }) : 'Never'}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {nodes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Server className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No nodes</h3>
          <p className="mt-1 text-sm text-gray-500">No monitored nodes are currently available.</p>
        </div>
      )}
    </div>
  );
}

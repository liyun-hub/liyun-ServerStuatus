import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNodeDetails, getNodeHistory } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft, Server, Activity, Cpu, MemoryStick } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NodeDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [node, setNode] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const nodeData = await getNodeDetails(id);
        setNode(nodeData);

        const to = Math.floor(Date.now() / 1000);
        const from = to - 3600; // Last hour
        const historyData = await getNodeHistory(id, from, to);
        setHistory(historyData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading && !node) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <p className="text-sm text-red-700">{error || 'Node not found'}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">{t('nodeDetail.back')}</Link>
      </div>
    );
  }

  const chartData = history.map((item: any) => ({
    time: format(item.timestamp * 1000, 'HH:mm'),
    cpu: item.cpuUsage,
    memory: item.memoryUsage,
    disk: item.diskUsage,
  }));

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700" title={t('nodeDetail.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          {node.displayName || node.hostname}
          {node.online ? (
            <span className="inline-flex h-3 w-3 rounded-full bg-green-500"></span>
          ) : (
            <span className="inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          )}
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-400" />
          {t('nodeDetail.systemInfo')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Hostname / IP</p>
            <p className="mt-1 text-sm text-gray-900">{node.hostname} / {node.ip}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t('nodeDetail.os')}</p>
            <p className="mt-1 text-sm text-gray-900 capitalize">{node.os} - {node.platform} {node.platformVersion}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Hardware</p>
            <p className="mt-1 text-sm text-gray-900">{node.cpuCores} {t('nodeDetail.cpuCores')} • {formatBytes(node.totalMemory)} RAM</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          {t('nodeDetail.performance')}
        </h2>
        
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-72">
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1"><Cpu className="h-4 w-4"/> {t('nodeDetail.cpuUsage')}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#3B82F6" fill="#EFF6FF" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-72">
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1"><MemoryStick className="h-4 w-4"/> {t('nodeDetail.memoryUsage')}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="memory" stroke="#8B5CF6" fill="#F5F3FF" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-500">
            No historical data available.
          </div>
        )}
      </div>
    </div>
  );
}

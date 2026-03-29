import { useEffect, useState } from 'react';
import { getAlertRules, getAlertEvents } from '../api';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function Alerts() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rulesData, eventsData] = await Promise.all([
          getAlertRules(),
          getAlertEvents(50)
        ]);
        setRules(rulesData || []);
        setEvents(eventsData || []);
      } catch (err) {
        // Handle error silently or show a toast
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && rules.length === 0 && events.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-gray-400" />
          {t('alerts.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('alerts.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-medium text-gray-900">{t('alerts.eventsTitle')}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{event.nodeId}</span>
                        <span className="text-sm text-gray-500 mt-1">{event.message}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                          {event.status}
                        </span>
                        <span className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(event.createdAt * 1000, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  {t('alerts.noEvents')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-medium text-gray-900">{t('alerts.title')}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div key={rule.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {rule.metric} {rule.operator} {rule.threshold}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {t('alerts.noRules')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getAlerts } from '../api';
import type { Alert } from '../types';

const SEVERITY: Record<string, { label: string; bg: string; color: string; border: string }> = {
  critical: { label: '严重', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  warning: { label: '警告', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  info: { label: '提示', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

export function AlertsPanel() {
  const [data, setData] = useState<Alert[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAlerts()
      .then(r => setData(r.alerts))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#6b7280' }}>加载中...</p>;
  if (error) return <p style={{ color: '#ef4444' }}>加载失败: {error}</p>;
  if (data.length === 0) return <p style={{ color: '#16a34a', textAlign: 'center', padding: 40 }}>近 7 天无告警 ✓</p>;

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>告警 ({data.length})</h3>
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>
        近 7 天，worker 每小时基于错误 / 功能健康自动评估（外部推送需配置 ALERT_WEBHOOK_URL）
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map(a => {
          const sev = SEVERITY[a.severity] || SEVERITY.info;
          return (
            <div key={a.id} style={{ ...rowStyle, background: sev.bg, borderColor: sev.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 700,
                  background: '#fff', color: sev.color, border: `1px solid ${sev.border}`,
                }}>
                  {sev.label}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{a.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              {a.detail && <div style={{ fontSize: '13px', color: '#374151', wordBreak: 'break-word' }}>{a.detail}</div>}
              <code style={{ fontSize: '11px', color: '#9ca3af' }}>{a.alert_key}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '20px', background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};
const rowStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 8, border: '1px solid #f3f4f6',
};

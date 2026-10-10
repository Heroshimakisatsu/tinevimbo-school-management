import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { GlassCard } from '../components/GlassCard';
import { Loader2, FileText, UserRoundPen, ArrowRightLeft } from 'lucide-react';

interface LogEntry {
  id: number;
  entity_type: string;
  payment_type: string;
  changed_by: string;
  previous_value: string | null;
  new_value: string;
  reason: string;
  details: string | null;
  created_at: string;
}

export function Logs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.get<LogEntry[]>('/logs');
        setEntries(data);
      } catch (error: any) {
        console.error('Failed to load logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Logs</h1>
          <p className="text-muted-foreground font-['Inter']">
            Audit trail for receipt-number changes.
          </p>
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading audit logs...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3 text-center">
              <FileText className="h-8 w-8" />
              <p>No log entries yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[20px] border border-border bg-background/60 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRoundPen className="h-4 w-4" />
                      <span className="font-semibold text-foreground">{entry.changed_by}</span>
                      <span>changed the receipt number for</span>
                      <span className="font-semibold capitalize text-foreground">{entry.payment_type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>from</span>
                      <span className="font-bold text-foreground">{entry.previous_value || '—'}</span>
                      <span>to</span>
                      <span className="font-bold text-foreground">{entry.new_value}</span>
                    </div>

                    <p className="text-sm text-foreground">
                      because <span className="font-semibold">“{entry.reason}”</span>
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground whitespace-nowrap md:text-right">
                    {new Date(entry.created_at).toLocaleString('en-ZW', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

export default function QueuePage() {
  const { companyId } = useParams();
  const [queue, setQueue] = useState<{ pending: number; accepted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api<{ queue: { pending: number; accepted: number } }>(`/queue/${companyId}`);
        if (mounted) setQueue(data.queue);
        if (mounted) setError(null);
      } catch (err) {
        console.error('Nie udało się pobrać kolejki:', err);
        if (mounted) setError('Nie udało się pobrać kolejki. Spróbuj ponownie za chwilę.');
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, [companyId]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Kolejka</h1>
      {queue ? (
        <div className="mt-3 space-y-1">
          <p>Oczekujące: {queue.pending}</p>
          <p>Zaakceptowane: {queue.accepted}</p>
        </div>
      ) : (
        <p>Ładowanie...</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

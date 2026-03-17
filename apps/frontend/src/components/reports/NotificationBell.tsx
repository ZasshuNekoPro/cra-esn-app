'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../../lib/api/reports';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const data = await reportsApi.countUnread();
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — bell stays at 0
    }
  }, []);

  useEffect((): (() => void) => {
    void fetchCount();
    const interval = setInterval((): void => { void fetchCount(); }, 60_000);
    return (): void => clearInterval(interval);
  }, [fetchCount]);

  const handleOpen = async (): Promise<void> => {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      try {
        const data = (await reportsApi.listNotifications()) as unknown as AppNotification[];
        setNotifications(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkRead = async (id: string): Promise<void> => {
    try {
      await reportsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async (): Promise<void> => {
    try {
      await reportsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 px-4 py-3 last:border-0 ${n.isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(n.id)}
                        className="shrink-0 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Lu
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(n.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

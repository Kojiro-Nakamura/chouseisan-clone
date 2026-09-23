'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type RecentEvent = { id: string; name: string; createdAt: number };

export default function Home() {
  const [name, setName] = useState('');
  const [datesText, setDatesText] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('chouseisan_recent_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentEvents(parsed);
      } catch (e) {}
    }
  }, []);

  const saveToRecent = (id: string, eventName: string) => {
    const newEvent = { id, name: eventName, createdAt: Date.now() };
    const saved = localStorage.getItem('chouseisan_recent_events');
    let events: RecentEvent[] = saved ? JSON.parse(saved) : [];
    
    events = events.filter(e => e.id !== id);
    events.unshift(newEvent);
    events = events.slice(0, 10);
    localStorage.setItem('chouseisan_recent_events', JSON.stringify(events));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dates = datesText.split('\n').map(d => d.trim()).filter(d => d !== '');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dates, password }),
      });
      
      const data = (await res.json()) as { eventId?: string; error?: string };
      if (res.ok && data.eventId) {
        saveToRecent(data.eventId, name);
        router.push(`/event/${data.eventId}`);
      } else {
        alert(data.error || '作成に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecent = async (id: string) => {
    const inputPassword = prompt('イベントを削除するためのパスワードを入力してください。\n（マスターパスワードも使用可能です）');
    if (inputPassword === null) return; // キャンセル

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword })
      });
      
      if (res.ok) {
        const updated = recentEvents.filter(e => e.id !== id);
        setRecentEvents(updated);
        localStorage.setItem('chouseisan_recent_events', JSON.stringify(updated));
        alert('イベントを削除しました');
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || '削除に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 py-12 space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">日程調整アプリ</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">イベント名</label>
            <input 
              type="text" 
              placeholder="例: 飲み会、会議など" 
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">候補日（改行で区切る）</label>
            <textarea 
              rows={5}
              placeholder="10/1(火) 19:00~&#10;10/2(水) 19:00~" 
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={datesText}
              onChange={(e) => setDatesText(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">削除用パスワード</label>
            <input 
              type="password" 
              placeholder="イベントを削除する際に必要です" 
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? '作成中...' : 'イベントを作成する'}
          </button>
        </form>
      </div>

      {recentEvents.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-md w-full">
          <h2 className="text-lg font-bold text-gray-800 mb-4">最近作成したイベント</h2>
          <ul className="space-y-3">
            {recentEvents.map(event => (
              <li key={event.id} className="flex justify-between items-center border-b pb-2">
                <div className="flex flex-col overflow-hidden">
                  <Link href={`/event/${event.id}`} className="text-blue-600 hover:underline font-medium truncate pr-4">
                    {event.name}
                  </Link>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteRecent(event.id)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded px-2 py-1 flex-shrink-0"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type EventData = {
  event: { id: string; name: string; description: string | null };
  dates: { id: string; eventId: string; dateString: string }[];
  participants: { id: string; name: string; answers: Record<string, number> }[];
};

export default function EventPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const router = useRouter();

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  const handleDelete = async () => {
    const inputPassword = prompt('イベントを削除するためのパスワードを入力してください。\n（マスターパスワードも使用可能です）');
    if (inputPassword === null) return;
    
    if (!confirm('本当にこのイベントを削除しますか？\n（この操作は取り消せません）')) return;
    
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword })
      });
      if (res.ok) {
        const saved = localStorage.getItem('chouseisan_recent_events');
        if (saved) {
          const events = JSON.parse(saved).filter((e: any) => e.id !== params.id);
          localStorage.setItem('chouseisan_recent_events', JSON.stringify(events));
        }
        alert('イベントを削除しました');
        router.push('/');
      } else {
        const errData = await res.json() as { error?: string };
        alert(errData.error || '削除に失敗しました');
      }
    } catch (e) {
      alert('通信エラーが発生しました');
    }
  };

  const handleStatusChange = (dateId: string, status: number) => {
    setAnswers(prev => ({ ...prev, [dateId]: status }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length !== data?.dates.length) {
      alert('すべての候補日に回答してください');
      return;
    }

    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, answers }),
      });
      if (res.ok) {
        setName('');
        setAnswers({});
        fetchEvent(); // 再読み込み
      } else {
        alert('登録に失敗しました');
      }
    } catch (e) {
      alert('通信エラーが発生しました');
    }
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (!data) return <div className="p-8 text-center">イベントが見つかりません</div>;

  const STATUS_MAP = { 2: '〇', 1: '△', 0: '×' };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">調整さんclone</h2>
          <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
            トップに戻る
          </Link>
        </div>

        {/* イベントヘッダー */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.event.name}</h1>
              <p className="text-gray-500">URLをシェアして参加者に入力を依頼してください。</p>
            </div>
            <button 
              onClick={handleDelete}
              className="text-red-600 border border-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              イベントを削除
            </button>
          </div>
        </div>

        {/* 出欠表 */}
        <div className="bg-white p-6 rounded-xl shadow-sm overflow-x-auto">
          <h2 className="text-xl font-bold mb-4 text-gray-800">出欠表</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left min-w-[120px]">日程</th>
                {data.participants.map(p => (
                  <th key={p.id} className="border p-2 min-w-[80px]">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dates.map(date => (
                <tr key={date.id}>
                  <td className="border p-2 font-medium">{date.dateString}</td>
                  {data.participants.map(p => (
                    <td key={p.id} className="border p-2 text-center text-lg">
                      {STATUS_MAP[p.answers[date.id] as keyof typeof STATUS_MAP] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.participants.length === 0 && (
            <p className="text-center text-gray-500 mt-4">まだ回答がありません</p>
          )}
        </div>

        {/* 出欠入力フォーム */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-800">出欠を入力する</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">日程の都合</label>
              {data.dates.map(date => (
                <div key={date.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="font-medium">{date.dateString}</span>
                  <div className="flex gap-2">
                    {[2, 1, 0].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(date.id, status)}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all duration-200 ${
                          answers[date.id] === status 
                            ? (status === 2 ? 'bg-green-500 border-green-600 text-white shadow-md scale-110' : status === 1 ? 'bg-yellow-400 border-yellow-500 text-yellow-900 shadow-md scale-110' : 'bg-red-500 border-red-600 text-white shadow-md scale-110')
                            : 'bg-white text-gray-300 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-500'
                        }`}
                      >
                        {STATUS_MAP[status as keyof typeof STATUS_MAP]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-medium mt-4">
              入力する
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

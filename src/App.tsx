import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { stops, Stop } from './data/stops';

// Кастомная иконка остановки
const stopIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 14px;
    height: 14px;
    background: #2AABEE;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(42,171,238,0.6);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface Report {
  id: string;
  stopId: string;
  type: string;
  text: string;
  time: string;
  user?: string;
}

const REPORT_TYPES = [
  { id: 'check', label: '🚨 Проверка', color: 'bg-red-500' },
  { id: 'crowded', label: '🚌 Забит', color: 'bg-orange-500' },
  { id: 'delay', label: '⏰ Опаздывает', color: 'bg-yellow-500' },
  { id: 'empty', label: '🟢 Свободно', color: 'bg-green-500' },
  { id: 'other', label: '💬 Другое', color: 'bg-blue-500' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function App() {
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReportType, setNewReportType] = useState('check');
  const [newReportText, setNewReportText] = useState('');
  const [tgUser, setTgUser] = useState<any>(null);

  // Telegram WebApp init
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f0f0f');
      tg.setBackgroundColor('#0f0f0f');
      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);
      }
    }

    // Загружаем сохранённые сообщения
    const saved = localStorage.getItem('riga-reports');
    if (saved) {
      try {
        setReports(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveReports = (newReports: Report[]) => {
    setReports(newReports);
    localStorage.setItem('riga-reports', JSON.stringify(newReports));
  };

  const addReport = () => {
    if (!selectedStop) return;

    const report: Report = {
      id: Date.now().toString(),
      stopId: selectedStop.id,
      type: newReportType,
      text: newReportText || REPORT_TYPES.find(t => t.id === newReportType)?.label || '',
      time: new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      user: tgUser ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : 'Аноним'
    };

    const updated = [report, ...reports];
    saveReports(updated);
    setShowAddForm(false);
    setNewReportText('');
    setNewReportType('check');
  };

  const stopReports = selectedStop
    ? reports.filter(r => r.stopId === selectedStop.id).slice(0, 10)
    : [];

  return (
    <div className="h-full w-full relative bg-telegram-bg text-white">
      {/* Карта */}
      <MapContainer
        center={[56.9496, 24.1052]}
        zoom={13}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ChangeView center={[56.9496, 24.1052]} />

        {stops.map(stop => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={stopIcon}
            eventHandlers={{
              click: () => {
                setSelectedStop(stop);
                setShowAddForm(false);
              }
            }}
          />
        ))}
      </MapContainer>

      {/* Верхняя панель */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 pointer-events-none">
        <div className="bg-telegram-card/90 backdrop-blur-md rounded-2xl px-4 py-3 pointer-events-auto shadow-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">Riga Transit</h1>
              <p className="text-xs text-telegram-secondary">Карта остановок + проверки</p>
            </div>
            <div className="text-right text-xs text-telegram-secondary">
              {tgUser ? `Привет, ${tgUser.first_name}` : 'Telegram'}
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя карточка остановки */}
      {selectedStop && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
          <div className="bg-telegram-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Заголовок */}
            <div className="p-4 border-b border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{selectedStop.name}</h2>
                  {selectedStop.routes && selectedStop.routes.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {selectedStop.routes.map(r => (
                        <span key={r} className="text-xs bg-telegram-accent/20 text-telegram-accent px-2 py-0.5 rounded-full">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedStop(null)}
                  className="text-telegram-secondary text-xl leading-none px-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Сообщения */}
            <div className="max-h-48 overflow-y-auto p-3 space-y-2">
              {stopReports.length === 0 ? (
                <p className="text-sm text-telegram-secondary text-center py-4">
                  Пока нет сообщений. Будьте первым!
                </p>
              ) : (
                stopReports.map(r => {
                  const typeInfo = REPORT_TYPES.find(t => t.id === r.type);
                  return (
                    <div key={r.id} className="bg-black/30 rounded-xl p-3 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo?.color || 'bg-gray-500'} text-white`}>
                          {typeInfo?.label || r.type}
                        </span>
                        <span className="text-xs text-telegram-secondary">{r.time}</span>
                      </div>
                      {r.text && r.text !== typeInfo?.label && (
                        <p className="text-white/90">{r.text}</p>
                      )}
                      <p className="text-xs text-telegram-secondary mt-1">{r.user}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Кнопка добавить */}
            {!showAddForm ? (
              <div className="p-3 border-t border-white/10">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-telegram-accent hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition"
                >
                  + Добавить информацию
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setNewReportType(t.id)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition ${
                        newReportType === t.id
                          ? t.color + ' text-white'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Комментарий (необязательно)"
                  value={newReportText}
                  onChange={e => setNewReportText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-telegram-accent"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-white/10 py-3 rounded-xl text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={addReport}
                    className="flex-1 bg-telegram-accent py-3 rounded-xl text-sm font-medium"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

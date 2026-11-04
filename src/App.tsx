import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { stops, type Stop } from './data/stops';
import { officialStops, gtfsMetadata } from './data/gtfs-data';

const activeStops: Stop[] = officialStops.length > 0 ? officialStops : stops;

type ReportType = 'check' | 'crowded' | 'delay' | 'empty' | 'other';
interface Report {
  id: string;
  stopId: string;
  type: ReportType;
  text: string;
  time: string;
  createdAt?: number;
  user?: string;
}
interface Coordinates { lat: number; lon: number; accuracy?: number }
interface TelegramUser { first_name?: string; last_name?: string }
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  initDataUnsafe?: { user?: TelegramUser };
}
declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

const CENTER: [number, number] = [56.9496, 24.1052];
const STORAGE_KEY = 'riga-reports';
const MAX_REPORTS = 100;
const REPORT_TYPES: { id: ReportType; label: string; color: string; dot: string }[] = [
  { id: 'check', label: 'Проверка', color: 'bg-red-500/20 text-red-300', dot: '#ef4444' },
  { id: 'crowded', label: 'Переполнен', color: 'bg-orange-500/20 text-orange-300', dot: '#f97316' },
  { id: 'delay', label: 'Задержка', color: 'bg-yellow-500/20 text-yellow-300', dot: '#eab308' },
  { id: 'empty', label: 'Свободно', color: 'bg-emerald-500/20 text-emerald-300', dot: '#10b981' },
  { id: 'other', label: 'Другое', color: 'bg-sky-500/20 text-sky-300', dot: '#38bdf8' },
];
const stopIcon = new L.DivIcon({
  className: 'stop-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' &&
    typeof item.stopId === 'string' &&
    REPORT_TYPES.some(type => type.id === item.type) &&
    typeof item.text === 'string' &&
    typeof item.time === 'string' &&
    (item.createdAt === undefined || typeof item.createdAt === 'number') &&
    (item.user === undefined || typeof item.user === 'string');
}

function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`;
}

function MapFocus({ target }: { target: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 16), { duration: 0.65 });
  }, [target, map]);
  return null;
}

function App() {
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('check');
  const [reportText, setReportText] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [gpsError, setGpsError] = useState('');
  const [mapTarget, setMapTarget] = useState<Coordinates | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#101317');
      tg.setBackgroundColor?.('#101317');
      setUser(tg.initDataUnsafe?.user ?? null);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setReports(parsed.filter(isReport).filter(item => activeStops.some(stop => stop.id === item.stopId)).slice(0, MAX_REPORTS));
        }
      }
    } catch (error) {
      console.warn('Не удалось прочитать локальные сообщения', error);
    }
  }, []);

  const matchingStops = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('lv');
    if (!query) return [];
    return activeStops.filter(stop =>
      stop.name.toLocaleLowerCase('lv').includes(query) ||
      stop.routes?.some(route => route.toLocaleLowerCase().includes(query))
    ).slice(0, 7);
  }, [search]);

  const nearestStops = useMemo(() => {
    if (!position) return [];
    return activeStops.map(stop => ({
      stop,
      distance: distanceKm(position, { lat: stop.lat, lon: stop.lon }),
    })).sort((a, b) => a.distance - b.distance).slice(0, 3);
  }, [position]);

  const selectedReports = useMemo(() => selectedStop
    ? reports.filter(report => report.stopId === selectedStop.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8)
    : [], [reports, selectedStop]);

  const persistReports = (next: Report[]) => {
    const limited = next.slice(0, MAX_REPORTS);
    setReports(limited);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.warn('Не удалось сохранить сообщение на устройстве', error);
    }
  };

  const selectStop = (stop: Stop) => {
    setSelectedStop(stop);
    setShowAddForm(false);
    setSearch(stop.name);
    setSearchOpen(false);
    setMapTarget({ lat: stop.lat, lon: stop.lon });
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('Браузер не поддерживает геолокацию');
      return;
    }
    setGpsState('loading');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      result => {
        const next = { lat: result.coords.latitude, lon: result.coords.longitude, accuracy: result.coords.accuracy };
        setPosition(next);
        setMapTarget(next);
        setGpsState('ready');
      },
      error => {
        setGpsState('error');
        setGpsError(error.code === error.PERMISSION_DENIED
          ? 'Разреши доступ к геолокации в настройках браузера'
          : error.code === error.TIMEOUT ? 'Не удалось определить местоположение вовремя' : 'Местоположение временно недоступно');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const addReport = () => {
    if (!selectedStop) return;
    const now = Date.now();
    const report: Report = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      stopId: selectedStop.id,
      type: reportType,
      text: reportText.trim().slice(0, 160),
      time: new Date(now).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: now,
      user: user?.first_name ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Аноним',
    };
    persistReports([report, ...reports]);
    setShowAddForm(false);
    setReportText('');
    setReportType('check');
  };

  return (
    <main className="app-shell">
      <MapContainer center={CENTER} zoom={13} className="map-canvas" zoomControl={false} preferCanvas>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapFocus target={mapTarget} />
        {activeStops.map(stop => (
          <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={stopIcon}
            eventHandlers={{ click: () => selectStop(stop) }} />
        ))}
        {position && <>
          <Circle center={[position.lat, position.lon]} radius={position.accuracy ?? 30}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.09, weight: 1 }} />
          <CircleMarker center={[position.lat, position.lon]} radius={7}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#0ea5e9', fillOpacity: 1 }} />
        </>}
      </MapContainer>

      <section className="top-overlay">
        <header className="glass header-card">
          <div className="brand-row">
            <div>
              <div className="brand-title">Riga Transit <span className="live-dot" /></div>
              <div className="brand-subtitle">Карта остановок Риги · {gtfsMetadata.importedAt ? 'официальные GTFS' : 'демо-данные'}</div>
            </div>
            <div className="user-chip">{user?.first_name ? `Привет, ${user.first_name}` : 'RĪGA'}</div>
          </div>
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              value={search}
              onChange={event => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Enter' && matchingStops[0]) selectStop(matchingStops[0]);
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Найти остановку или район"
              aria-label="Поиск остановки"
            />
            {search && <button className="clear-search" onClick={() => { setSearch(''); setSearchOpen(true); }} aria-label="Очистить поиск">×</button>}
          </div>
          {searchOpen && matchingStops.length > 0 && (
            <div className="search-results">
              {matchingStops.map(stop => (
                <button key={stop.id} onClick={() => selectStop(stop)} className="search-result">
                  <span className="result-pin">●</span>
                  <span><strong>{stop.name}</strong><small>{stop.routes?.length ? `Линии в демо: ${stop.routes.join(', ')}` : 'Остановка / точка'}</small></span>
                  <span className="result-arrow">↗</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && search.trim() && matchingStops.length === 0 && (
            <div className="search-empty">Ничего не найдено по запросу «{search}»</div>
          )}
        </header>
      </section>

      <div className="map-actions">
        <button className="map-action gps-button" onClick={locateMe} disabled={gpsState === 'loading'}>
          <span>{gpsState === 'loading' ? '…' : '◎'}</span>
          {gpsState === 'loading' ? 'Определяем…' : 'Где я'}
        </button>
        {position && nearestStops[0] && (
          <button className="map-action nearest-button" onClick={() => selectStop(nearestStops[0].stop)}>
            <span>⌖</span> Ближайшая · {formatDistance(nearestStops[0].distance)}
          </button>
        )}
      </div>

      {gpsError && <div className="gps-error" role="status">{gpsError}<button onClick={() => setGpsError('')}>×</button></div>}

      {position && nearestStops.length > 0 && !selectedStop && (
        <aside className="nearest-panel glass">
          <div className="panel-eyebrow">РЯДОМ С ВАМИ</div>
          {nearestStops.map(({ stop, distance }) => (
            <button key={stop.id} className="nearest-row" onClick={() => selectStop(stop)}>
              <span className="nearest-name">{stop.name}</span><span className="nearest-distance">{formatDistance(distance)}</span>
            </button>
          ))}
        </aside>
      )}

      {selectedStop && (
        <section className="stop-sheet glass" aria-label={`Остановка ${selectedStop.name}`}>
          <div className="sheet-handle" />
          <div className="sheet-heading">
            <div>
              <div className="panel-eyebrow">ОСТАНОВКА · {gtfsMetadata.importedAt ? 'ОФИЦИАЛЬНЫЕ ДАННЫЕ' : 'ДЕМО-КАТАЛОГ'}</div>
              <h2>{selectedStop.name}</h2>
              {selectedStop.routes && selectedStop.routes.length > 0 && (
                <div className="route-chips">
                  {selectedStop.routes.map(route => <span key={route}>№ {route}</span>)}
                </div>
              )}
            </div>
            <button className="close-sheet" onClick={() => { setSelectedStop(null); setShowAddForm(false); }} aria-label="Закрыть">×</button>
          </div>

          <div className="reports-heading"><span>Сообщения сообщества</span><span className="local-label">только на этом устройстве</span></div>
          <div className="reports-list">
            {selectedReports.length === 0 ? (
              <div className="empty-reports"><span>◌</span><p>Пока нет сообщений</p><small>Добавь первое наблюдение об этой остановке</small></div>
            ) : selectedReports.map(report => {
              const type = REPORT_TYPES.find(item => item.id === report.type);
              return <article className="report-card" key={report.id}>
                <div className="report-meta"><span className={`report-tag ${type?.color ?? ''}`}>{type?.label ?? 'Сообщение'}</span><time>{report.time}</time></div>
                {report.text && <p>{report.text}</p>}
                <small>{report.user ?? 'Аноним'}</small>
              </article>;
            })}
          </div>

          {!showAddForm ? (
            <button className="primary-button" onClick={() => setShowAddForm(true)}>＋ Добавить наблюдение</button>
          ) : (
            <div className="report-form">
              <div className="form-title">Что происходит на остановке?</div>
              <div className="report-type-grid">
                {REPORT_TYPES.map(type => (
                  <button key={type.id} onClick={() => setReportType(type.id)}
                    className={`report-type ${reportType === type.id ? 'selected' : ''}`}>
                    <i style={{ background: type.dot }} />{type.label}
                  </button>
                ))}
              </div>
              <input className="comment-input" value={reportText} maxLength={160}
                onChange={event => setReportText(event.target.value)} placeholder="Комментарий до 160 символов (необязательно)" />
              <div className="form-footer"><span>{reportText.length}/160</span>
                <button className="secondary-button" onClick={() => setShowAddForm(false)}>Отмена</button>
                <button className="primary-button compact" onClick={addReport}>Опубликовать</button>
              </div>
            </div>
          )}
          <div className="data-note">{gtfsMetadata.importedAt ? `GTFS: обновлено ${gtfsMetadata.importedAt}. Расписание и маршруты ещё не реализованы.` : 'Данные остановок и номера линий пока демонстрационные, не использовать для планирования поездки.'}</div>
        </section>
      )}

      <div className="map-credit">© OpenStreetMap · CARTO</div>
    </main>
  );
}

export default App;

import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { type Stop } from './data/stops';
import { officialStops, gtfsMetadata } from './data/gtfs-data';

// Never show hand-entered demo coordinates: only official GTFS stops are allowed on the map.
const activeStops: Stop[] = officialStops;

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
type TimetableEntry = [string, string, string, string, string, string, string];
interface CalendarService { service_id: string; monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string; start_date: string; end_date: string }
interface CalendarException { service_id: string; date: string; exception_type: string }
interface DepartureGroup { key: string; route: string; routeName: string; routeType: string; headsign: string; departures: Date[] }
let timetableIndexCache: Record<string, number> | null = null;
const timetableShardCache = new Map<number, Record<string, TimetableEntry[]>>();

function serviceRunsOn(serviceId: string, date: Date, calendar: CalendarService[], exceptions: CalendarException[]): boolean {
  const dateKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const exception = exceptions.find(item => item.service_id === serviceId && item.date === dateKey);
  if (exception) return exception.exception_type === '1';
  const service = calendar.find(item => item.service_id === serviceId);
  if (!service || dateKey < service.start_date || dateKey > service.end_date) return false;
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as keyof CalendarService;
  return service[day] === '1';
}

function buildUpcomingDepartures(entries: TimetableEntry[], calendar: CalendarService[], exceptions: CalendarException[], now: number): DepartureGroup[] {
  if (!calendar.length && !exceptions.length) return [];
  const groups = new Map<string, DepartureGroup>();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = now + 24 * 60 * 60 * 1000;
  for (let offset = 0; offset <= 2; offset++) {
    const serviceDate = new Date(start);
    serviceDate.setDate(serviceDate.getDate() - offset);
    for (const entry of entries) {
      const [time, route, routeName, routeType, serviceId, headsign, directionId] = entry;
      if (!serviceRunsOn(serviceId, serviceDate, calendar, exceptions)) continue;
      const parts = time.split(':').map(Number);
      if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) continue;
      const departure = new Date(serviceDate.getTime() + (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
      if (departure.getTime() <= now || departure.getTime() > end) continue;
      const key = `${route}|${headsign}|${directionId}`;
      const group = groups.get(key) ?? { key, route, routeName, routeType, headsign, departures: [] };
      group.departures.push(departure);
      groups.set(key, group);
    }
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    departures: group.departures.sort((a, b) => a.getTime() - b.getTime()).slice(0, 12),
  })).sort((a, b) => (a.departures[0]?.getTime() ?? 0) - (b.departures[0]?.getTime() ?? 0));
}


function buildDeparturesForDate(entries: TimetableEntry[], calendar: CalendarService[], exceptions: CalendarException[], targetDate: Date): DepartureGroup[] {
  if (!calendar.length && !exceptions.length) return [];
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const groups = new Map<string, DepartureGroup>();
  for (let offset = 0; offset <= 2; offset++) {
    const serviceDate = new Date(dayStart);
    serviceDate.setDate(serviceDate.getDate() - offset);
    for (const entry of entries) {
      const [time, route, routeName, routeType, serviceId, headsign, directionId] = entry;
      if (!serviceRunsOn(serviceId, serviceDate, calendar, exceptions)) continue;
      const parts = time.split(':').map(Number);
      if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) continue;
      const departure = new Date(serviceDate.getTime() + (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
      if (departure < dayStart || departure >= dayEnd) continue;
      const key = route + '|' + headsign + '|' + directionId;
      const group = groups.get(key) ?? { key, route, routeName, routeType, headsign, departures: [] };
      group.departures.push(departure);
      groups.set(key, group);
    }
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    departures: group.departures.sort((a, b) => a.getTime() - b.getTime()),
  })).sort((a, b) => (a.departures[0]?.getTime() ?? 0) - (b.departures[0]?.getTime() ?? 0));
}

function transportType(type: string): string {
  if (type === '0') return 'Трамвай';
  if (type === '11') return 'Троллейбус';
  if (type === '2') return 'Поезд';
  if (type === '4') return 'Паром';
  return 'Автобус';
}

function minutesUntil(date: Date, now: number): number { return Math.max(0, Math.ceil((date.getTime() - now) / 60000)); }

function transportIcon(type: string): string {
  if (type === '0') return '🚋';
  if (type === '11') return '🚎';
  if (type === '2') return '🚆';
  if (type === '4') return '⛴';
  return '🚌';
}

function departureDayLabel(date: Date, now: number): string {
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString() ? 'завтра' : 'сегодня';
}

function formatDeparture(date: Date, now: number): string {
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `${time} · завтра`;
  return time;
}

interface TelegramUser { first_name?: string; last_name?: string; photo_url?: string }
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
const FAVORITES_KEY = 'riga-favorite-stops';
const RECENT_KEY = 'riga-recent-stops';
const MAX_REPORTS = 100;
const REPORT_TTL_MS = 2 * 60 * 60 * 1000;
const REPORT_TYPES: { id: ReportType; label: string; color: string; dot: string }[] = [
  { id: 'check', label: 'Проверка', color: 'bg-red-500/20 text-red-300', dot: '#ef4444' },
  { id: 'crowded', label: 'Переполнен', color: 'bg-orange-500/20 text-orange-300', dot: '#f97316' },
  { id: 'delay', label: 'Задержка', color: 'bg-yellow-500/20 text-yellow-300', dot: '#eab308' },
  { id: 'empty', label: 'Свободно', color: 'bg-emerald-500/20 text-emerald-300', dot: '#10b981' },
  { id: 'other', label: 'Другое', color: 'bg-sky-500/20 text-sky-300', dot: '#38bdf8' },
];
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

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('orientationchange', resize);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('resize', resize);
    };
  }, [map]);

  return null;
}


const clusterIcon = (count: number) => L.divIcon({
  className: 'stop-cluster-icon',
  html: `<span>${count}</span>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function StopLayer({ stops: mapStops, selectedStop, onSelect }: { stops: Stop[]; selectedStop: Stop | null; onSelect: (stop: Stop) => void }) {
  const map = useMap();
  const [viewport, setViewport] = useState(0);
  useMapEvents({
    zoomend: () => setViewport(value => value + 1),
    moveend: () => setViewport(value => value + 1),
  });

  const groups = useMemo(() => {
    const bounds = map.getBounds().pad(0.18);
    const visible = mapStops.filter(stop => bounds.contains([stop.lat, stop.lon]));
    const zoom = map.getZoom();
    if (zoom >= 16) {
      return visible.map(stop => ({ items: [stop], lat: stop.lat, lon: stop.lon }));
    }

    const cellSize = zoom >= 15 ? 38 : zoom >= 14 ? 32 : 28;
    const buckets = new Map<string, Stop[]>();
    for (const stop of visible) {
      const point = map.project([stop.lat, stop.lon], zoom);
      const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(stop);
      else buckets.set(key, [stop]);
    }

    return Array.from(buckets.values()).map(items => {
      if (items.length === 1) return { items, lat: items[0].lat, lon: items[0].lon };
      const meanLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
      const meanLon = items.reduce((sum, item) => sum + item.lon, 0) / items.length;
      const anchor = items.reduce((best, item) => {
        const score = (item.lat - meanLat) ** 2 + (item.lon - meanLon) ** 2;
        const bestScore = (best.lat - meanLat) ** 2 + (best.lon - meanLon) ** 2;
        return score < bestScore ? item : best;
      }, items[0]);
      return { items, lat: anchor.lat, lon: anchor.lon };
    });
  }, [map, mapStops, viewport]);

  return (
    <>
      {groups.map(group => group.items.length === 1 ? (
        <CircleMarker key={group.items[0].id}
          center={[group.items[0].lat, group.items[0].lon]} radius={selectedStop?.id === group.items[0].id ? 8 : 5}
          pathOptions={{ color: '#ffffff', weight: selectedStop?.id === group.items[0].id ? 2.5 : 1.8, opacity: 1, fillColor: selectedStop?.id === group.items[0].id ? '#d7ad68' : '#167da8', fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelect(group.items[0]) }} />
      ) : (
        <Marker key={group.items.map(item => item.id).join('|')}
          position={[group.lat, group.lon]} icon={clusterIcon(group.items.length)}
          eventHandlers={{ click: () => map.setView([group.lat, group.lon], Math.min(map.getZoom() + 2, 18), { animate: true }) }} />
      ))}
    </>
  );
}
function MapZoomControl() {
  const map = useMap();
  return (
    <div className="zoom-control" aria-label="Управление масштабом карты">
      <button onClick={() => map.zoomIn()} aria-label="Приблизить карту">+</button>
      <span />
      <button onClick={() => map.zoomOut()} aria-label="Отдалить карту">−</button>
    </div>
  );
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [calendarData, setCalendarData] = useState<{ calendar: CalendarService[]; exceptions: CalendarException[] }>({ calendar: [], exceptions: [] });
  const [calendarStatus, setCalendarStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [scheduleEntries, setScheduleEntries] = useState<TimetableEntry[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [scheduleClock, setScheduleClock] = useState(Date.now());
  const [scheduleTransportFilter, setScheduleTransportFilter] = useState('all');
  const [expandedScheduleRoutes, setExpandedScheduleRoutes] = useState<string[]>([]);
  const [scheduleViewOpen, setScheduleViewOpen] = useState(false);
  const [scheduleDateOffset, setScheduleDateOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'map' | 'favorites'>('map');
  const [showStopMarkers, setShowStopMarkers] = useState(true);
  const [showNearbyPanel, setShowNearbyPanel] = useState(true);
  const [mapMuted, setMapMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/gtfs/calendar.json').then(response => { if (!response.ok) throw new Error('calendar'); return response.json() as Promise<CalendarService[]>; }),
      fetch('/data/gtfs/calendar_dates.json').then(response => { if (!response.ok) throw new Error('calendar_dates'); return response.json() as Promise<CalendarException[]>; }),
    ]).then(([calendar, exceptions]) => {
      if (!cancelled) { setCalendarData({ calendar, exceptions }); setCalendarStatus('ready'); }
    }).catch(error => { console.warn('Не удалось загрузить календарь GTFS', error); if (!cancelled) setCalendarStatus('error'); });
    const timer = window.setInterval(() => setScheduleClock(Date.now()), 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!selectedStop) { setScheduleEntries([]); setScheduleStatus('idle'); return; }
    let cancelled = false;
    setScheduleStatus('loading');
    setScheduleEntries([]);
    const load = async () => {
      try {
        if (!timetableIndexCache) {
          const response = await fetch('/data/gtfs/timetable-index.json');
          if (!response.ok) throw new Error('Расписание пока не опубликовано');
          timetableIndexCache = await response.json() as Record<string, number>;
        }
        const shardId = timetableIndexCache[selectedStop.id];
        if (typeof shardId !== 'number') {
          if (!cancelled) setScheduleStatus('empty');
          return;
        }
        let shard = timetableShardCache.get(shardId);
        if (!shard) {
          const response = await fetch(`/data/gtfs/timetables/${String(shardId).padStart(2, '0')}.json`);
          if (!response.ok) throw new Error('Не удалось загрузить расписание');
          shard = await response.json() as Record<string, TimetableEntry[]>;
          timetableShardCache.set(shardId, shard);
        }
        const entries = shard[selectedStop.id] ?? [];
        if (!cancelled) {
          setScheduleEntries(entries);
          setScheduleStatus(entries.length ? 'ready' : 'empty');
        }
      } catch (error) {
        console.warn('Ошибка загрузки расписания остановки', error);
        if (!cancelled) setScheduleStatus('error');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedStop?.id]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#111820');
      tg.setBackgroundColor?.('#111820');
      setUser(tg.initDataUnsafe?.user ?? null);
    }
    try {
      const savedProfileName = localStorage.getItem('riga-profile-name') ?? '';
      setShowStopMarkers(localStorage.getItem('riga-show-stops') !== 'false');
      setShowNearbyPanel(localStorage.getItem('riga-show-nearby') !== 'false');
      setMapMuted(localStorage.getItem('riga-map-muted') === 'true');
      setProfileName(savedProfileName);
      setProfileNameDraft(savedProfileName);
      const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
      if (Array.isArray(savedFavorites)) setFavoriteIds(savedFavorites.filter((id): id is string => typeof id === 'string' && activeStops.some(stop => stop.id === id)));
      const savedRecent = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
      if (Array.isArray(savedRecent)) setRecentIds(savedRecent.filter((id): id is string => typeof id === 'string' && activeStops.some(stop => stop.id === id)).slice(0, 6));
    } catch (error) {
      console.warn('Не удалось прочитать избранные остановки', error);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setReports(parsed.filter(isReport).filter(item => item.createdAt !== undefined && Date.now() - item.createdAt <= REPORT_TTL_MS && activeStops.some(stop => stop.id === item.stopId)).slice(0, MAX_REPORTS));
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

  const upcomingDepartures = useMemo(() => buildUpcomingDepartures(
    scheduleEntries, calendarData.calendar, calendarData.exceptions, scheduleClock,
  ), [scheduleEntries, calendarData, scheduleClock]);

  const visibleDepartures = useMemo(() => scheduleTransportFilter === 'all' ? upcomingDepartures : upcomingDepartures.filter(group => group.routeType === scheduleTransportFilter), [upcomingDepartures, scheduleTransportFilter]);
  const selectedScheduleDate = useMemo(() => {
    const date = new Date(scheduleClock);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + scheduleDateOffset);
    return date;
  }, [scheduleClock, scheduleDateOffset]);
  const fullDayDepartures = useMemo(() => buildDeparturesForDate(
    scheduleEntries, calendarData.calendar, calendarData.exceptions, selectedScheduleDate,
  ), [scheduleEntries, calendarData, selectedScheduleDate]);
  const visibleFullDayDepartures = useMemo(() => scheduleTransportFilter === 'all'
    ? fullDayDepartures
    : fullDayDepartures.filter(group => group.routeType === scheduleTransportFilter),
  [fullDayDepartures, scheduleTransportFilter]);


  const selectedReports = useMemo(() => selectedStop
    ? reports.filter(report => report.stopId === selectedStop.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8)
    : [], [reports, selectedStop]);

  const persistReports = (next: Report[]) => {
    const cutoff = Date.now() - REPORT_TTL_MS;
    const limited = next.filter(item => item.createdAt !== undefined && item.createdAt >= cutoff).slice(0, MAX_REPORTS);
    setReports(limited);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.warn('Не удалось сохранить сообщение на устройстве', error);
    }
  };

  const savePreference = (key: string, value: boolean, setter: (value: boolean) => void) => {
    setter(value);
    try { localStorage.setItem(key, String(value)); } catch (error) { console.warn('Не удалось сохранить настройку', error); }
  };

  const saveProfileName = () => {
    const next = profileNameDraft.trim().slice(0, 32);
    setProfileName(next);
    setProfileNameDraft(next);
    try { localStorage.setItem('riga-profile-name', next); }
    catch (error) { console.warn('Не удалось сохранить имя профиля', error); }
  };

  const openProfileQuickList = () => {
    setShowProfile(false);
    setSearch('');
    setSearchOpen(true);
  };

  const toggleFavorite = (stop: Stop) => {
    const next = favoriteIds.includes(stop.id) ? favoriteIds.filter(id => id !== stop.id) : [stop.id, ...favoriteIds];
    setFavoriteIds(next);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); }
    catch (error) { console.warn('Не удалось сохранить избранное', error); }
  };

  const selectStop = (stop: Stop) => {
    const nextRecent = [stop.id, ...recentIds.filter(id => id !== stop.id)].slice(0, 6);
    setRecentIds(nextRecent);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent)); }
    catch (error) { console.warn('Не удалось сохранить историю поиска', error); }
    setSelectedStop(stop);
    setShowAddForm(false);
    setScheduleViewOpen(false);
    setScheduleDateOffset(0);
    setExpandedScheduleRoutes([]);
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
    <main className={mapMuted ? "app-shell map-muted" : "app-shell"}>
      <MapContainer center={CENTER} zoom={14.5} className="map-canvas" zoomControl={false} preferCanvas>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapResize />
        <MapZoomControl />
        <MapFocus target={mapTarget} />
        {showStopMarkers && <StopLayer stops={activeStops} selectedStop={selectedStop} onSelect={selectStop} />}
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
              <div className="brand-title"><span className="brand-mark">R</span> Riga Transit</div>
              <div className="brand-subtitle">ГОРОДСКОЙ ТРАНСПОРТ · RĪGA</div>
            </div>
            <button className="user-chip profile-trigger" onClick={() => { setProfileNameDraft(profileName); setShowProfile(true); }} aria-label="Открыть профиль">{user?.photo_url ? <img className="profile-trigger-photo" src={user.photo_url} alt="" /> : <span className="profile-trigger-avatar">{(profileName || user?.first_name || "Г").slice(0,1).toLocaleUpperCase("ru-RU")}</span>}<span>Профиль</span><span className="profile-trigger-chevron">↗</span></button>
          </div>
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={event => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Enter' && matchingStops[0]) selectStop(matchingStops[0]);
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Остановка или маршрут"
              aria-label="Поиск остановки"
            />
            {search && <button className="clear-search" onClick={() => { setSearch(''); setSearchOpen(true); }} aria-label="Очистить поиск">×</button>}
          </div>
          {searchOpen && matchingStops.length > 0 && (
            <div className="search-results">
              {matchingStops.map(stop => (
                <button key={stop.id} onClick={() => selectStop(stop)} className="search-result">
                  <span className="result-pin">●</span>
                  <span><strong>{stop.name}</strong><small>{stop.routes?.length ? `Маршруты: ${stop.routes.join(', ')}` : 'Остановка общественного транспорта'}</small></span>
                  <span className="result-arrow">↗</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && !search.trim() && (favoriteIds.length > 0 || recentIds.length > 0) && (
            <div className="quick-access">
              {favoriteIds.length > 0 && <div className="quick-group">
                <div className="quick-heading"><span>ИЗБРАННОЕ</span><span>★ {favoriteIds.length}</span></div>
                {favoriteIds.slice(0, 5).map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-star">★</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || 'Остановка'}</small></button>
                ))}
              </div>}
              {recentIds.length > 0 && <div className="quick-group">
                <div className="quick-heading"><span>НЕДАВНИЕ</span><span>ПОСЛЕДНИЕ</span></div>
                {recentIds.slice(0, 4).map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-recent">↺</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || 'Остановка'}</small></button>
                ))}
              </div>}
            </div>
          )}
          {searchOpen && search.trim() && matchingStops.length === 0 && (
            <div className="search-empty">Ничего не найдено по запросу «{search}»</div>
          )}
        </header>
      </section>

      {showProfile && (
        <div className="profile-backdrop" onClick={() => setShowProfile(false)}>
          <section className="profile-panel glass" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={event => event.stopPropagation()}>
            <div className="profile-panel-top">
              <div className="panel-eyebrow">RIGA TRANSIT · ЛИЧНОЕ ПРОСТРАНСТВО</div>
              <button className="close-sheet" onClick={() => setShowProfile(false)} aria-label="Закрыть профиль">×</button>
            </div>
            <div className="profile-identity">
              {user?.photo_url ? <img className="profile-avatar profile-avatar-photo" src={user.photo_url} alt="" /> : <div className="profile-avatar">{(profileName || user?.first_name || "Г").slice(0,1).toLocaleUpperCase("ru-RU")}</div>}
              <div className="profile-identity-copy">
                <h2 id="profile-title">{profileName || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Гость Riga Transit"}</h2>
                <span className="profile-status"><i /> {user ? "Имя получено из Telegram Mini App" : "Локальный профиль"}</span>
              </div>
            </div>
            <div className="profile-name-edit">
              <label htmlFor="profile-name">Отображаемое имя</label>
              <div className="profile-name-row">
                <input id="profile-name" value={profileNameDraft} maxLength={32} onChange={event => setProfileNameDraft(event.target.value)} placeholder={user?.first_name || "Как к вам обращаться"} />
                <button onClick={saveProfileName} disabled={profileNameDraft.trim() === profileName}>Сохранить</button>
              </div>
              <small>Имя видно только в этом приложении на данном устройстве.</small>
            </div>
            <div className="profile-section-title">ВАША АКТИВНОСТЬ</div>
            <div className="profile-stats">
              <div className="profile-stat"><strong>{favoriteIds.length}</strong><span>Избранное</span></div>
              <div className="profile-stat"><strong>{recentIds.length}</strong><span>Недавние</span></div>
              <div className="profile-stat"><strong>{reports.length}</strong><span>Наблюдения</span></div>
            </div>
            <div className="profile-links">
              <button onClick={openProfileQuickList}><span className="profile-link-icon">★</span><span><strong>Мои остановки</strong><small>Избранное и недавние просмотры</small></span><b>↗</b></button>
              <button onClick={() => { setShowProfile(false); setPosition(null); setGpsState("idle"); setGpsError(""); }}><span className="profile-link-icon">◎</span><span><strong>Сбросить геолокацию</strong><small>Убрать мою позицию с карты</small></span><b>↗</b></button>
            </div>
            <div className="profile-section-title">НАСТРОЙКИ КАРТЫ</div>
            <div className="profile-preferences">
              <label><span><strong>Остановки на карте</strong><small>Показывать маркеры остановок</small></span><input type="checkbox" checked={showStopMarkers} onChange={event => savePreference('riga-show-stops', event.target.checked, setShowStopMarkers)} /></label>
              <label><span><strong>Ближайшие остановки</strong><small>Показывать список рядом со мной</small></span><input type="checkbox" checked={showNearbyPanel} onChange={event => savePreference('riga-show-nearby', event.target.checked, setShowNearbyPanel)} /></label>
              <label><span><strong>Приглушённая карта</strong><small>Менее яркая подложка карты</small></span><input type="checkbox" checked={mapMuted} onChange={event => savePreference('riga-map-muted', event.target.checked, setMapMuted)} /></label>
            </div>
            <div className="profile-footnote">Данные профиля и избранное хранятся локально. Серверная учётная запись и синхронизация пока не подключены.</div>
          </section>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="map-actions">
          <button className="map-action gps-button" onClick={locateMe} disabled={gpsState === 'loading'}>
            <span>{gpsState === 'loading' ? '…' : '◎'}</span>
            {gpsState === 'loading' ? 'Определяем…' : 'Где я'}
          </button>
        </div>
      )}

      {activeTab === 'map' && gpsError && <div className="gps-error" role="status">{gpsError}<button onClick={() => setGpsError('')}>×</button></div>}

      {activeTab === 'map' && showNearbyPanel && position && nearestStops.length > 0 && !selectedStop && (
        <aside className="nearest-panel glass">
          <div className="panel-eyebrow">РЯДОМ С ВАМИ</div>
          {nearestStops.slice(0, 3).map(({ stop, distance }, index) => (
            <button key={stop.id} className="nearest-row" onClick={() => selectStop(stop)}>
              <span className="nearest-index">{index + 1}</span><span className="nearest-name">{stop.name}</span><span className="nearest-distance">{formatDistance(distance)}</span>
            </button>
          ))}
        </aside>
      )}

      {selectedStop && (
        <section className={scheduleViewOpen ? "stop-sheet glass schedule-open" : "stop-sheet glass"} aria-label={`Остановка ${selectedStop.name}`}>
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
              <div className="schedule-panel">
                <div className="schedule-panel-top">
                  <div>
                    <div className="schedule-heading"><span>ОТПРАВЛЕНИЯ</span><small>ОФИЦИАЛЬНОЕ РАСПИСАНИЕ</small></div>
                    <div className="schedule-subtitle">Ближайшие рейсы с этой остановки</div>
                  </div>
                  <span className="schedule-live-dot" aria-label="Плановое расписание" />
                </div>
                <div className="schedule-filter" role="group" aria-label="Фильтр транспорта">
                  {[{id:'all',label:'Все'}, {id:'3',label:'Автобусы'}, {id:'11',label:'Троллейбусы'}, {id:'0',label:'Трамваи'}].map(filter => (
                    <button key={filter.id} className={scheduleTransportFilter === filter.id ? 'active' : ''} onClick={() => setScheduleTransportFilter(filter.id)}>{filter.label}</button>
                  ))}
                </div>
                {!scheduleViewOpen && <div className="schedule-open-row">
                  <div><strong>Расписание на весь день</strong><small>Все рейсы и направления</small></div>
                  <button onClick={() => { setScheduleDateOffset(0); setScheduleViewOpen(true); }}>Открыть <span>↗</span></button>
                </div>}
                {scheduleStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />Загружаем расписание остановки…</div>}
                {scheduleStatus === 'error' && <div className="schedule-state">Не удалось загрузить расписание. Проверьте соединение и откройте остановку ещё раз.</div>}
                {scheduleStatus === 'empty' && <div className="schedule-state">Для этой остановки нет опубликованных отправлений.</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'loading' && <div className="schedule-state">Проверяем дни и календарь движения…</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'error' && <div className="schedule-state">Календарь движения временно недоступен. Попробуйте позже.</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'ready' && visibleDepartures.length === 0 && <div className="schedule-state">{upcomingDepartures.length ? 'Нет рейсов выбранного типа в ближайшие 24 часа.' : 'В ближайшие 24 часа плановых отправлений не найдено.'}</div>}
                {visibleDepartures.map(group => {
                  const first = group.departures[0];
                  const expanded = expandedScheduleRoutes.includes(group.key);
                  const shown = expanded ? group.departures : group.departures.slice(0, 3);
                  const minutes = first ? minutesUntil(first, scheduleClock) : 0;
                  return (
                    <article className="schedule-route-card" key={group.key}>
                      <div className="schedule-card-head">
                        <span className={'schedule-vehicle-icon type-' + group.routeType}>{transportIcon(group.routeType)}</span>
                        <span className="schedule-route-number">{group.route}</span>
                        <span className="schedule-route-copy"><strong>{group.headsign || group.routeName || 'Направление не указано'}</strong><small>{transportType(group.routeType)}{group.routeName ? ' · ' + group.routeName : ''}</small></span>
                        <span className="schedule-next">
                          <strong>{first ? first.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : '—'}</strong>
                          <small>{first ? departureDayLabel(first, scheduleClock) + ' · ' : ''}{minutes < 1 ? 'сейчас' : minutes < 60 ? 'через ' + minutes + ' мин' : 'через ' + Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин'}</small>
                        </span>
                      </div>
                      <div className="schedule-departures-label"><span>СЛЕДУЮЩИЕ ОТПРАВЛЕНИЯ</span><span>{group.departures.length} рейсов</span></div>
                      <div className="schedule-times">
                        {shown.map((departure, index) => <span className={index === 0 ? 'schedule-time next' : 'schedule-time'} key={departure.toISOString()}>
                          <strong>{formatDeparture(departure, scheduleClock)}</strong>
                          {index === 0 && <small>{minutes < 1 ? 'сейчас' : '+' + minutes + ' мин'}</small>}
                        </span>)}
                      </div>
                      {group.departures.length > 3 && <button className="schedule-expand" onClick={() => setExpandedScheduleRoutes(current => expanded ? current.filter(key => key !== group.key) : [...current, group.key])}>
                        {expanded ? 'Свернуть расписание' : 'Показать ещё ' + (group.departures.length - 3) + ' отправлений'} <span>{expanded ? '⌃' : '⌄'}</span>
                      </button>}
                    </article>
                  );
                })}

                {scheduleViewOpen && <div className="full-schedule-view">
                  <div className="full-schedule-toolbar">
                    <div><strong>Полное расписание</strong><small>{selectedStop.name} · все отправления</small></div>
                    <button onClick={() => setScheduleViewOpen(false)} aria-label="Закрыть полное расписание">×</button>
                  </div>
                  {scheduleStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />Загружаем полное расписание…</div>}
                  {scheduleStatus === 'error' && <div className="schedule-state">Не удалось загрузить расписание. Проверьте соединение и попробуйте снова.</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'loading' && <div className="schedule-state">Загружаем календарь движения…</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'error' && <div className="schedule-state">Календарь движения временно недоступен.</div>}
                  <div className="schedule-date-tabs" role="group" aria-label="Дата расписания">
                    <button className={scheduleDateOffset === 0 ? 'active' : ''} onClick={() => setScheduleDateOffset(0)}>Сегодня</button>
                    <button className={scheduleDateOffset === 1 ? 'active' : ''} onClick={() => setScheduleDateOffset(1)}>Завтра</button>
                    <span>{selectedScheduleDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</span>
                  </div>
                  {scheduleStatus === 'ready' && calendarStatus === 'ready' && visibleFullDayDepartures.length === 0 && <div className="schedule-state">На выбранную дату отправлений не найдено.</div>}
                  {visibleFullDayDepartures.map(group => <article className="full-route-group" key={group.key}>
                    <div className="full-route-heading">
                      <span className={'schedule-vehicle-icon type-' + group.routeType}>{transportIcon(group.routeType)}</span>
                      <span className="schedule-route-number">{group.route}</span>
                      <span className="full-route-copy"><strong>{group.headsign || group.routeName || 'Направление не указано'}</strong><small>{transportType(group.routeType)} · {group.departures.length} рейсов</small></span>
                    </div>
                    <div className="full-departure-list">
                      {group.departures.map(departure => {
                        const passed = departure.getTime() < scheduleClock;
                        const isNext = !passed && !group.departures.some(item => item.getTime() >= scheduleClock && item.getTime() < departure.getTime());
                        return <div className={passed ? 'full-departure passed' : isNext ? 'full-departure next' : 'full-departure'} key={departure.toISOString()}>
                          <strong>{departure.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</strong>
                          <small>{passed ? 'Прошёл' : isNext ? 'Следующий рейс' : 'По расписанию'}</small>
                        </div>;
                      })}
                    </div>
                  </article>)}
                  <div className="schedule-footnote"><span>ⓘ</span> Плановые времена GTFS. Реальные задержки и GPS транспорта не учитываются.</div>
                </div>}
                <div className="schedule-footnote"><span>ⓘ</span> Время плановое. Фактические задержки и движение транспорта здесь не отображаются.</div>
              </div>
            </div>
            <div className="sheet-actions"><button className={"favorite-toggle " + (favoriteIds.includes(selectedStop.id) ? "is-favorite" : "")} onClick={() => toggleFavorite(selectedStop)} aria-label={favoriteIds.includes(selectedStop.id) ? "Убрать из избранного" : "Добавить в избранное"} title={favoriteIds.includes(selectedStop.id) ? "В избранном" : "В избранное"}>{favoriteIds.includes(selectedStop.id) ? "★" : "☆"}</button><button className="close-sheet" onClick={() => { setSelectedStop(null); setShowAddForm(false); }} aria-label="Закрыть">×</button></div>
          </div>

          <div className="reports-heading"><span>Сообщения сообщества</span><span className="local-label">локально · актуально 2 часа</span></div>
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
          <div className="data-note"><span className="data-check">✓</span> Официальные данные Rīgas satiksme · {gtfsMetadata.importedAt}</div>
        </section>
      )}

      {activeTab === 'favorites' && !selectedStop && (
        <aside className="favorites-panel glass">
          <div className="favorites-panel-heading"><span>МОИ ОСТАНОВКИ</span><small>{favoriteIds.length} В ИЗБРАННОМ</small></div>
          {favoriteIds.length === 0 ? <div className="favorites-empty">Пока нет избранных остановок. Открой карточку остановки и нажми ☆.</div> :
            favoriteIds.map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
              <button className="favorites-row" key={stop.id} onClick={() => { setActiveTab('map'); selectStop(stop); }}>
                <span className="favorites-star">★</span><span className="favorites-name">{stop.name}</span><small>{stop.routes?.slice(0, 4).join(' · ') || 'Остановка'}</small><b>↗</b>
              </button>
            ))}
        </aside>
      )}

      <nav className="bottom-nav" aria-label="Основная навигация">
        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => { setActiveTab('map'); setSelectedStop(null); setSearchOpen(false); }}><span>⌖</span><small>Карта</small></button>
        <button className={activeTab === 'favorites' ? 'active' : ''} onClick={() => { setActiveTab('favorites'); setSelectedStop(null); setSearchOpen(false); }}><span>☆</span><small>Избранное</small></button>
        <button onClick={() => { setProfileNameDraft(profileName); setShowProfile(true); }}><span>◉</span><small>Профиль</small></button>
      </nav>

      
    </main>
  );
}

export default App;

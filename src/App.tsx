import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { type Stop } from './data/stops';
import { officialStops, gtfsMetadata } from './data/gtfs-data';

// Never show hand-entered demo coordinates: only official GTFS stops are allowed on the map.
const activeStops: Stop[] = officialStops;


type AppLanguage = 'ru' | 'lv' | 'en';
const LANGUAGE_LABELS: Record<AppLanguage, { name: string; native: string }> = {
  ru: { name: 'Русский', native: 'РУ' },
  lv: { name: 'Latviešu', native: 'LV' },
  en: { name: 'English', native: 'EN' },
};
const I18N: Record<string, Record<AppLanguage, string>> = {
  profile: { ru: 'Профиль', lv: 'Profils', en: 'Profile' },
  closeProfile: { ru: 'Закрыть профиль', lv: 'Aizvērt profilu', en: 'Close profile' },
  personalSpace: { ru: 'RIGA TRANSIT · ЛИЧНОЕ ПРОСТРАНСТВО', lv: 'RIGA TRANSIT · PERSONĪGĀ TELPA', en: 'RIGA TRANSIT · PERSONAL SPACE' },
  telegramUser: { ru: 'Имя получено из Telegram Mini App', lv: 'Vārds saņemts no Telegram Mini App', en: 'Name provided by Telegram Mini App' },
  localProfile: { ru: 'Локальный профиль', lv: 'Lokālais profils', en: 'Local profile' },
  guest: { ru: 'Гость Riga Transit', lv: 'Riga Transit viesis', en: 'Riga Transit guest' },
  displayName: { ru: 'Отображаемое имя', lv: 'Attēlojamais vārds', en: 'Display name' },
  namePlaceholder: { ru: 'Как к вам обращаться', lv: 'Kā jūs uzrunāt', en: 'What should we call you?' },
  save: { ru: 'Сохранить', lv: 'Saglabāt', en: 'Save' },
  nameLocal: { ru: 'Имя видно только в этом приложении на данном устройстве.', lv: 'Vārds ir redzams tikai šajā lietotnē un ierīcē.', en: 'Your name is visible only in this app on this device.' },
  activity: { ru: 'ВАША АКТИВНОСТЬ', lv: 'JŪSU AKTIVITĀTE', en: 'YOUR ACTIVITY' },
  favorites: { ru: 'Избранное', lv: 'Izlase', en: 'Favorites' },
  recent: { ru: 'Недавние', lv: 'Nesenās', en: 'Recent' },
  reports: { ru: 'Наблюдения', lv: 'Ziņojumi', en: 'Reports' },
  myStops: { ru: 'Мои остановки', lv: 'Manas pieturas', en: 'My stops' },
  myStopsHint: { ru: 'Избранное и недавние просмотры', lv: 'Izlase un nesen skatītās pieturas', en: 'Favorites and recently viewed stops' },
  resetLocation: { ru: 'Сбросить геолокацию', lv: 'Atiestatīt atrašanās vietu', en: 'Reset location' },
  resetLocationHint: { ru: 'Убрать мою позицию с карты', lv: 'Noņemt manu atrašanās vietu no kartes', en: 'Remove my position from the map' },
  mapSettings: { ru: 'НАСТРОЙКИ КАРТЫ', lv: 'KARTES IESTATĪJUMI', en: 'MAP SETTINGS' },
  showStops: { ru: 'Остановки на карте', lv: 'Pieturas kartē', en: 'Stops on map' },
  showStopsHint: { ru: 'Показывать маркеры остановок', lv: 'Rādīt pieturu marķierus', en: 'Show stop markers' },
  nearby: { ru: 'Ближайшие остановки', lv: 'Tuvākās pieturas', en: 'Nearby stops' },
  nearbyHint: { ru: 'Показывать список рядом со мной', lv: 'Rādīt tuvumā esošo pieturu sarakstu', en: 'Show nearby stops list' },
  mutedMap: { ru: 'Приглушённая карта', lv: 'Blāvāka karte', en: 'Dimmed map' },
  mutedMapHint: { ru: 'Менее яркая подложка карты', lv: 'Mazāk spilgts kartes fons', en: 'Use a less bright map background' },
  language: { ru: 'ЯЗЫК ПРИЛОЖЕНИЯ', lv: 'LIETOTNES VALODA', en: 'APP LANGUAGE' },
  languageHint: { ru: 'Выберите язык интерфейса', lv: 'Izvēlieties saskarnes valodu', en: 'Choose your interface language' },
  localData: { ru: 'Данные профиля, избранное и история хранятся на этом устройстве. Серверная синхронизация пока не подключена.', lv: 'Profila dati, izlase un vēsture tiek glabāti šajā ierīcē. Sinhronizācija ar serveri vēl nav pievienota.', en: 'Profile data, favorites and history are stored on this device. Server sync is not connected yet.' },
  clearRecent: { ru: 'Очистить историю', lv: 'Notīrīt vēsturi', en: 'Clear history' },
  clearRecentHint: { ru: 'Удалить список недавно просмотренных остановок', lv: 'Dzēst nesen skatīto pieturu sarakstu', en: 'Clear recently viewed stops' },
  map: { ru: 'Карта', lv: 'Karte', en: 'Map' },
  searchPlaceholder: { ru: 'Остановка или маршрут', lv: 'Pietura vai maršruts', en: 'Stop or route' },
  searchStop: { ru: 'Поиск остановки', lv: 'Meklēt pieturu', en: 'Search stops' },
  clearSearch: { ru: 'Очистить поиск', lv: 'Notīrīt meklēšanu', en: 'Clear search' },
  nothingFound: { ru: 'Ничего не найдено по запросу', lv: 'Nekas nav atrasts pēc vaicājuma', en: 'No results found for' },
  recentLabel: { ru: 'НЕДАВНИЕ', lv: 'NESENĀS', en: 'RECENT' },
  latest: { ru: 'ПОСЛЕДНИЕ', lv: 'PĒDĒJĀS', en: 'LATEST' },
  nearbyLabel: { ru: 'РЯДОМ С ВАМИ', lv: 'JUMS TUVU', en: 'NEAR YOU' },
  stop: { ru: 'ОСТАНОВКА', lv: 'PIETURA', en: 'STOP' },
  officialData: { ru: 'ОФИЦИАЛЬНЫЕ ДАННЫЕ', lv: 'OFICIĀLIE DATI', en: 'OFFICIAL DATA' },
  demoCatalog: { ru: 'ДЕМО-КАТАЛОГ', lv: 'DEMO KATALOGS', en: 'DEMO CATALOG' },
  departures: { ru: 'ОТПРАВЛЕНИЯ', lv: 'IZBRAUKŠANA', en: 'DEPARTURES' },
  officialSchedule: { ru: 'ОФИЦИАЛЬНОЕ РАСПИСАНИЕ', lv: 'OFICIĀLAIS SARAKSTS', en: 'OFFICIAL TIMETABLE' },
  nearestDepartures: { ru: 'Ближайшие рейсы с этой остановки', lv: 'Tuvākie reisi no šīs pieturas', en: 'Upcoming departures from this stop' },
  all: { ru: 'Все', lv: 'Visi', en: 'All' },
  buses: { ru: 'Автобусы', lv: 'Autobusi', en: 'Buses' },
  trolleybuses: { ru: 'Троллейбусы', lv: 'Trolejbusi', en: 'Trolleybuses' },
  trams: { ru: 'Трамваи', lv: 'Tramvaji', en: 'Trams' },
  fullDay: { ru: 'Расписание на весь день', lv: 'Visas dienas saraksts', en: 'Full-day timetable' },
  allTrips: { ru: 'Все рейсы и направления', lv: 'Visi reisi un virzieni', en: 'All trips and directions' },
  open: { ru: 'Открыть', lv: 'Atvērt', en: 'Open' },
  today: { ru: 'Сегодня', lv: 'Šodien', en: 'Today' },
  tomorrow: { ru: 'Завтра', lv: 'Rīt', en: 'Tomorrow' },
  fullSchedule: { ru: 'Полное расписание', lv: 'Pilns kustības saraksts', en: 'Full timetable' },
  allDepartures: { ru: 'все отправления', lv: 'visi reisi', en: 'all departures' },
  routeSearch: { ru: 'Номер маршрута или направление', lv: 'Maršruta numurs vai virziens', en: 'Route number or direction' },
  route: { ru: 'Маршрут', lv: 'Maršruts', en: 'Route' },
  allRoutes: { ru: '← Ко всем маршрутам', lv: '← Pie visiem maršrutiem', en: '← All routes' },
  routeStops: { ru: 'ОСТАНОВКИ ПО ХОДУ МАРШРУТА', lv: 'MARŠRUTA PIETURAS', en: 'STOPS ALONG THE ROUTE' },
  youAreHere: { ru: 'Вы здесь', lv: 'Jūs esat šeit', en: 'You are here' },
  plannedTimes: { ru: 'Плановые времена GTFS. Реальные задержки и GPS транспорта не учитываются.', lv: 'Plānotie GTFS laiki. Reālie kavējumi un transporta GPS dati netiek ņemti vērā.', en: 'Scheduled GTFS times. Live delays and vehicle GPS are not included.' },
  mapTab: { ru: 'Карта', lv: 'Karte', en: 'Map' },
  favoritesTab: { ru: 'Избранное', lv: 'Izlase', en: 'Favorites' },
  whereAmI: { ru: 'Где я', lv: 'Kur es esmu', en: 'Locate me' },
  locating: { ru: 'Определяем…', lv: 'Nosaka atrašanās vietu…', en: 'Locating…' },
  loadingSchedule: { ru: t('loadingSchedule'), lv: 'Ielādē pieturas sarakstu…', en: 'Loading stop timetable…' },
  scheduleError: { ru: t('scheduleError'), lv: 'Neizdevās ielādēt sarakstu. Pārbaudiet savienojumu un atveriet pieturu vēlreiz.', en: 'Could not load the timetable. Check your connection and reopen the stop.' },
  noDepartures: { ru: t('noDepartures'), lv: 'Šai pieturai nav publicētu reisu.', en: 'No published departures for this stop.' },
  calendarLoading: { ru: t('calendarLoading'), lv: 'Pārbauda kustības kalendāru…', en: 'Checking service calendar…' },
  noTodayTrips: { ru: t('noTodayTrips'), lv: 'Izvēlētajā datumā reisi nav atrasti.', en: 'No departures found for the selected date.' },
  favoritesEmpty: { ru: 'Пока нет избранных остановок. Открой карточку остановки и нажми ☆.', lv: 'Izlasē vēl nav pieturu. Atver pieturas kartīti un nospied ☆.', en: 'No favorite stops yet. Open a stop card and tap ☆.' },
  stopSingular: { ru: t('stopSingular'), lv: 'Sabiedriskā transporta pietura', en: 'Public transport stop' },
};

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
interface DepartureGroup { key: string; route: string; routeName: string; routeType: string; headsign: string; directionId: string; departures: Date[] }
interface RoutePattern { route: string; routeName: string; routeType: string; headsign: string; directionId: string; stops: { stopId: string; sequence: number }[] }
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
      const group: DepartureGroup = groups.get(key) ?? { key, route, routeName, routeType, headsign, directionId, departures: [] };
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
      const group: DepartureGroup = groups.get(key) ?? { key, route, routeName, routeType, headsign, directionId, departures: [] };
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
  const time = date.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' });
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
  const [language, setLanguage] = useState<AppLanguage>(() => { try { const saved = localStorage.getItem('riga-language'); return saved === 'lv' || saved === 'en' ? saved : 'ru'; } catch { return 'ru'; } });
  const t = (key: string) => I18N[key]?.[language] ?? I18N[key]?.ru ?? key;
  const localeCode = language === 'ru' ? 'ru-RU' : language === 'lv' ? 'lv-LV' : 'en-GB';
  const [calendarData, setCalendarData] = useState<{ calendar: CalendarService[]; exceptions: CalendarException[] }>({ calendar: [], exceptions: [] });
  const [calendarStatus, setCalendarStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [scheduleEntries, setScheduleEntries] = useState<TimetableEntry[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const [scheduleClock, setScheduleClock] = useState(Date.now());
  const [scheduleTransportFilter, setScheduleTransportFilter] = useState('all');
  const [expandedScheduleRoutes, setExpandedScheduleRoutes] = useState<string[]>([]);
  const [scheduleViewOpen, setScheduleViewOpen] = useState(false);
  const [scheduleDateOffset, setScheduleDateOffset] = useState(0);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [routePatterns, setRoutePatterns] = useState<RoutePattern[] | null>(null);
  const [routePatternsStatus, setRoutePatternsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<DepartureGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'favorites'>('map');
  const [showStopMarkers, setShowStopMarkers] = useState(true);
  const [showNearbyPanel, setShowNearbyPanel] = useState(true);
  const [mapMuted, setMapMuted] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('riga-language', language); } catch (error) { console.warn('Could not save language preference', error); }
    document.documentElement.lang = language;
  }, [language]);

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
    if (!selectedRouteDetail || routePatterns) return;
    let cancelled = false;
    setRoutePatternsStatus('loading');
    fetch('/data/gtfs/route-patterns.json')
      .then(response => { if (!response.ok) throw new Error('Route patterns unavailable'); return response.json() as Promise<RoutePattern[]>; })
      .then(patterns => {
        if (!cancelled) { setRoutePatterns(patterns); setRoutePatternsStatus('ready'); }
      })
      .catch(error => {
        console.warn('Не удалось загрузить последовательность остановок маршрута', error);
        if (!cancelled) setRoutePatternsStatus('error');
      });
    return () => { cancelled = true; };
  }, [selectedRouteDetail?.key, routePatterns]);

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
  const visibleFullDayDepartures = useMemo(() => {
    const query = scheduleSearch.trim().toLocaleLowerCase('ru-RU');
    return fullDayDepartures.filter(group => {
      const matchesType = scheduleTransportFilter === 'all' || group.routeType === scheduleTransportFilter;
      const matchesSearch = !query || group.route.toLocaleLowerCase('ru-RU').includes(query)
        || group.headsign.toLocaleLowerCase('ru-RU').includes(query)
        || group.routeName.toLocaleLowerCase('ru-RU').includes(query);
      return matchesType && matchesSearch;
    });
  }, [fullDayDepartures, scheduleTransportFilter, scheduleSearch]);


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
    setSelectedRouteDetail(null);
    setScheduleViewOpen(false);
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
              <div className="brand-subtitle">{language === 'ru' ? 'ГОРОДСКОЙ ТРАНСПОРТ · RĪGA' : language === 'lv' ? 'PILSĒTAS TRANSPORTS · RĪGA' : 'CITY TRANSPORT · RĪGA'}</div>
            </div>
            <button className="user-chip profile-trigger" onClick={() => { setProfileNameDraft(profileName); setShowProfile(true); }} aria-label={t('profile')}>{user?.photo_url ? <img className="profile-trigger-photo" src={user.photo_url} alt="" /> : <span className="profile-trigger-avatar">{(profileName || user?.first_name || "Г").slice(0,1).toLocaleUpperCase("ru-RU")}</span>}<span>{t('profile')}</span><span className="profile-trigger-chevron">↗</span></button>
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
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchStop')}
            />
            {search && <button className="clear-search" onClick={() => { setSearch(''); setSearchOpen(true); }} aria-label={t('clearSearch')}>×</button>}
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
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-star">★</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || t('stopSingular')}</small></button>
                ))}
              </div>}
              {recentIds.length > 0 && <div className="quick-group">
                <div className="quick-heading"><span>{t('recentLabel')}</span><span>{t('latest')}</span></div>
                {recentIds.slice(0, 4).map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-recent">↺</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || 'Остановка'}</small></button>
                ))}
              </div>}
            </div>
          )}
          {searchOpen && search.trim() && matchingStops.length === 0 && (
            <div className="search-empty">{t('nothingFound')} «{search}»</div>
          )}
        </header>
      </section>

      {showProfile && (
        <div className="profile-backdrop" onClick={() => setShowProfile(false)}>
          <section className="profile-panel glass" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={event => event.stopPropagation()}>
            <div className="profile-panel-top">
              <div><div className="panel-eyebrow">{t('personalSpace')}</div><span className="profile-kicker">YOUR CITY · YOUR ROUTES</span></div>
              <button className="close-sheet" onClick={() => setShowProfile(false)} aria-label={t('closeProfile')}>×</button>
            </div>
            <div className="profile-identity">
              {user?.photo_url ? <img className="profile-avatar profile-avatar-photo" src={user.photo_url} alt="" /> : <div className="profile-avatar">{(profileName || user?.first_name || "R").slice(0,1).toLocaleUpperCase(localeCode)}</div>}
              <div className="profile-identity-copy">
                <h2 id="profile-title">{profileName || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || t('guest')}</h2>
                <span className="profile-status"><i /> {user ? t('telegramUser') : t('localProfile')}</span>
                <small className="profile-device-tag">{user ? 'TELEGRAM MINI APP' : 'RIGA TRANSIT ID'}</small>
              </div>
            </div>
            <div className="profile-name-edit">
              <label htmlFor="profile-name">{t('displayName')}</label>
              <div className="profile-name-row">
                <input id="profile-name" value={profileNameDraft} maxLength={32} onChange={event => setProfileNameDraft(event.target.value)} placeholder={user?.first_name || t('namePlaceholder')} />
                <button onClick={saveProfileName} disabled={profileNameDraft.trim() === profileName}>{t('save')}</button>
              </div>
              <small>{t('nameLocal')}</small>
            </div>
            <div className="profile-section-title">{t('activity')}</div>
            <div className="profile-stats">
              <div className="profile-stat"><strong>{favoriteIds.length}</strong><span>{t('favorites')}</span></div>
              <div className="profile-stat"><strong>{recentIds.length}</strong><span>{t('recent')}</span></div>
              <div className="profile-stat"><strong>{reports.length}</strong><span>{t('reports')}</span></div>
            </div>
            <div className="profile-links">
              <button onClick={openProfileQuickList}><span className="profile-link-icon">★</span><span><strong>{t('myStops')}</strong><small>{t('myStopsHint')}</small></span><b>↗</b></button>
              <button onClick={() => { setShowProfile(false); setPosition(null); setGpsState("idle"); setGpsError(""); }}><span className="profile-link-icon">◎</span><span><strong>{t('resetLocation')}</strong><small>{t('resetLocationHint')}</small></span><b>↗</b></button>
              <button onClick={() => { setRecentIds([]); try { localStorage.removeItem(RECENT_KEY); } catch (error) { console.warn('Could not clear recent stops', error); } }} disabled={recentIds.length === 0}><span className="profile-link-icon">↺</span><span><strong>{t('clearRecent')}</strong><small>{t('clearRecentHint')}</small></span><b>×</b></button>
            </div>
            <div className="profile-section-title">{t('language')}</div>
            <div className="profile-language-card">
              <div className="profile-language-copy"><strong>{t('languageHint')}</strong><small>Русский · Latviešu · English</small></div>
              <div className="profile-language-options" role="group" aria-label={t('language')}>
                {(['ru','lv','en'] as AppLanguage[]).map(code => <button key={code} className={language === code ? 'active' : ''} onClick={() => setLanguage(code)} aria-pressed={language === code}><span>{LANGUAGE_LABELS[code].native}</span><small>{LANGUAGE_LABELS[code].name}</small></button>)}
              </div>
            </div>
            <div className="profile-section-title">{t('mapSettings')}</div>
            <div className="profile-preferences">
              <label><span><strong>{t('showStops')}</strong><small>{t('showStopsHint')}</small></span><input type="checkbox" checked={showStopMarkers} onChange={event => savePreference('riga-show-stops', event.target.checked, setShowStopMarkers)} /></label>
              <label><span><strong>{t('nearby')}</strong><small>{t('nearbyHint')}</small></span><input type="checkbox" checked={showNearbyPanel} onChange={event => savePreference('riga-show-nearby', event.target.checked, setShowNearbyPanel)} /></label>
              <label><span><strong>{t('mutedMap')}</strong><small>{t('mutedMapHint')}</small></span><input type="checkbox" checked={mapMuted} onChange={event => savePreference('riga-map-muted', event.target.checked, setMapMuted)} /></label>
            </div>
            <div className="profile-footnote"><span>ⓘ</span>{t('localData')}</div>
          </section>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="map-actions">
          <button className="map-action gps-button" onClick={locateMe} disabled={gpsState === 'loading'}>
            <span>{gpsState === 'loading' ? '…' : '◎'}</span>
            {gpsState === 'loading' ? t('locating') : t('whereAmI')}
          </button>
        </div>
      )}

      {activeTab === 'map' && gpsError && <div className="gps-error" role="status">{gpsError}<button onClick={() => setGpsError('')}>×</button></div>}

      {activeTab === 'map' && showNearbyPanel && position && nearestStops.length > 0 && !selectedStop && (
        <aside className="nearest-panel glass">
          <div className="panel-eyebrow">{t('nearbyLabel')}</div>
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
              <div className="panel-eyebrow">{t('stop')} · {gtfsMetadata.importedAt ? t('officialData') : t('demoCatalog')}</div>
              <h2>{selectedStop.name}</h2>
              {selectedStop.routes && selectedStop.routes.length > 0 && (
                <div className="route-chips">
                  {selectedStop.routes.map(route => <span key={route}>№ {route}</span>)}
                </div>
              )}
              <div className="schedule-panel">
                <div className="schedule-panel-top">
                  <div>
                    <div className="schedule-heading"><span>{t('departures')}</span><small>{t('officialSchedule')}</small></div>
                    <div className="schedule-subtitle">{t('nearestDepartures')}</div>
                  </div>
                  <span className="schedule-live-dot" aria-label="Плановое расписание" />
                </div>
                <div className="schedule-filter" role="group" aria-label="Фильтр транспорта">
                  {[{id:'all',label:t('all')}, {id:'3',label:t('buses')}, {id:'11',label:t('trolleybuses')}, {id:'0',label:t('trams')}].map(filter => (
                    <button key={filter.id} className={scheduleTransportFilter === filter.id ? 'active' : ''} onClick={() => setScheduleTransportFilter(filter.id)}>{filter.label}</button>
                  ))}
                </div>
                {!scheduleViewOpen && <div className="schedule-open-row">
                  <div><strong>{t('fullDay')}</strong><small>{t('allTrips')}</small></div>
                  <button onClick={() => { setScheduleDateOffset(0); setScheduleSearch(''); setSelectedRouteDetail(null); setScheduleViewOpen(true); }}>{t('open')} <span>↗</span></button>
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
                          <strong>{first ? first.toLocaleTimeString(localeCode, {hour:'2-digit', minute:'2-digit'}) : '—'}</strong>
                          <small>{first ? departureDayLabel(first, scheduleClock) + ' · ' : ''}{minutes < 1 ? 'сейчас' : minutes < 60 ? 'через ' + minutes + ' мин' : 'через ' + Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин'}</small>
                        </span>
                      </div>
                      <div className="schedule-times">
                        {shown.map((departure, index) => <span className={index === 0 ? 'schedule-time next' : 'schedule-time'} key={departure.toISOString()}>
                          <strong>{formatDeparture(departure, scheduleClock)}</strong>
                          {index === 0 && <small>{minutes < 1 ? 'сейчас' : '+' + minutes + ' мин'}</small>}
                        </span>)}
                      </div>
                      <div className="schedule-card-actions">
                        {group.departures.length > 3 && <button className="schedule-expand" onClick={() => setExpandedScheduleRoutes(current => expanded ? current.filter(key => key !== group.key) : [...current, group.key])}>
                          {expanded ? 'Свернуть' : 'Ещё ' + (group.departures.length - 3) + ' рейсов'} <span>{expanded ? '⌃' : '⌄'}</span>
                        </button>}
                        <button className="schedule-route-detail-link" onClick={() => { setScheduleDateOffset(0); setSelectedRouteDetail(group); setScheduleViewOpen(true); }}>Маршрут <span>↗</span></button>
                      </div>
                    </article>
                  );
                })}

                {scheduleViewOpen && <div className="full-schedule-view">
                  <div className="full-schedule-toolbar">
                    <div><strong>{t('fullSchedule')}</strong><small>{selectedStop.name} · {t('allDepartures')}</small></div>
                    <button onClick={() => { setScheduleViewOpen(false); setSelectedRouteDetail(null); setScheduleSearch(''); }} aria-label="Закрыть полное расписание">×</button>
                  </div>
                  {scheduleStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />Загружаем полное расписание…</div>}
                  {scheduleStatus === 'error' && <div className="schedule-state">Не удалось загрузить расписание. Проверьте соединение и попробуйте снова.</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'loading' && <div className="schedule-state">Загружаем календарь движения…</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'error' && <div className="schedule-state">Календарь движения временно недоступен.</div>}
                  <label className="schedule-search">
                    <span>⌕</span>
                    <input value={scheduleSearch} onChange={event => setScheduleSearch(event.target.value)} placeholder={t('routeSearch')} aria-label="Поиск по расписанию" />
                    {scheduleSearch && <button onClick={() => setScheduleSearch('')} aria-label="Очистить поиск">×</button>}
                  </label>
                  <div className="schedule-results-count">{visibleFullDayDepartures.length} {visibleFullDayDepartures.length === 1 ? 'направление' : 'направлений'} · {visibleFullDayDepartures.reduce((sum, group) => sum + group.departures.length, 0)} отправлений</div>
                  <div className="schedule-date-tabs" role="group" aria-label="Дата расписания">
                    <button className={scheduleDateOffset === 0 ? 'active' : ''} onClick={() => setScheduleDateOffset(0)}>{t('today')}</button>
                    <button className={scheduleDateOffset === 1 ? 'active' : ''} onClick={() => setScheduleDateOffset(1)}>{t('tomorrow')}</button>
                    <span>{selectedScheduleDate.toLocaleDateString(localeCode, { day: 'numeric', month: 'long', weekday: 'short' })}</span>
                  </div>
                  {scheduleStatus === 'ready' && calendarStatus === 'ready' && visibleFullDayDepartures.length === 0 && <div className="schedule-state">На выбранную дату отправлений не найдено.</div>}
                  {selectedRouteDetail ? (
                    <section className="route-detail-view">
                      <button className="route-detail-back" onClick={() => setSelectedRouteDetail(null)}>{t('allRoutes')}</button>
                      <div className="route-detail-title">
                        <span className={'schedule-vehicle-icon type-' + selectedRouteDetail.routeType}>{transportIcon(selectedRouteDetail.routeType)}</span>
                        <span className="schedule-route-number">{selectedRouteDetail.route}</span>
                        <span><strong>{selectedRouteDetail.headsign || selectedRouteDetail.routeName}</strong><small>{transportType(selectedRouteDetail.routeType)} · {selectedRouteDetail.headsign || 'Направление'}</small></span>
                      </div>
                      <div className="route-detail-caption">{t('routeStops')}</div>
                      {routePatternsStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />Загружаем маршрут и остановки…</div>}
                      {routePatternsStatus === 'error' && <div className="schedule-state">Не удалось загрузить схему маршрута. Попробуйте открыть её ещё раз.</div>}
                      {routePatternsStatus === 'ready' && (() => {
                        const pattern = routePatterns?.find(item => item.route === selectedRouteDetail.route && item.headsign === selectedRouteDetail.headsign && item.directionId === selectedRouteDetail.directionId);
                        if (!pattern) return <div className="schedule-state">Для этого направления схема остановок в опубликованных данных не найдена.</div>;
                        return <ol className="route-stop-list">
                          {pattern.stops.map((item, index) => {
                            const stop = activeStops.find(candidate => candidate.id === item.stopId);
                            const isCurrent = item.stopId === selectedStop.id;
                            return <li className={isCurrent ? 'current' : ''} key={item.stopId + '-' + item.sequence}>
                              <span className="route-stop-marker">{index + 1}</span>
                              <span className="route-stop-name">{stop?.name || 'Остановка ' + item.stopId}{isCurrent && <small>{t('youAreHere')}</small>}</span>
                            </li>;
                          })}
                        </ol>;
                      })()}
                    </section>
                  ) : visibleFullDayDepartures.map(group => <article className="full-route-group" key={group.key}>
                    <button className="full-route-heading route-open-button" onClick={() => setSelectedRouteDetail(group)} aria-label={'Открыть маршрут ' + group.route + ', ' + group.headsign}>
                      <span className={'schedule-vehicle-icon type-' + group.routeType}>{transportIcon(group.routeType)}</span>
                      <span className="schedule-route-number">{group.route}</span>
                      <span className="full-route-copy"><strong>{group.headsign || group.routeName || 'Направление не указано'}</strong><small>{transportType(group.routeType)} · {group.departures.length} рейсов</small></span>
                      <span className="route-open-chevron">›</span>
                    </button>
                    <div className="full-departure-list">
                      {group.departures.map(departure => {
                        const passed = departure.getTime() < scheduleClock;
                        const isNext = !passed && !group.departures.some(item => item.getTime() >= scheduleClock && item.getTime() < departure.getTime());
                        return <div className={passed ? 'full-departure passed' : isNext ? 'full-departure next' : 'full-departure'} key={departure.toISOString()}>
                          <strong>{departure.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' })}</strong>
                          <small>{passed ? (language === 'ru' ? 'Прошёл' : language === 'lv' ? 'Pagājis' : 'Departed') : isNext ? (language === 'ru' ? 'Следующий рейс' : language === 'lv' ? 'Nākamais reiss' : 'Next departure') : (language === 'ru' ? 'По расписанию' : language === 'lv' ? 'Pēc saraksta' : 'Scheduled')}</small>
                        </div>;
                      })}
                    </div>
                  </article>)}
                  <div className="schedule-footnote"><span>ⓘ</span> {t('plannedTimes')}</div>
                </div>}
                <div className="schedule-footnote"><span>ⓘ</span> {t('plannedTimes')}</div>
              </div>
            </div>
            <div className="sheet-actions"><button className={"favorite-toggle " + (favoriteIds.includes(selectedStop.id) ? "is-favorite" : "")} onClick={() => toggleFavorite(selectedStop)} aria-label={favoriteIds.includes(selectedStop.id) ? "Убрать из избранного" : "Добавить в избранное"} title={favoriteIds.includes(selectedStop.id) ? "В избранном" : "В избранное"}>{favoriteIds.includes(selectedStop.id) ? "★" : "☆"}</button><button className="close-sheet" onClick={() => { setSelectedStop(null); setSelectedRouteDetail(null); setScheduleViewOpen(false); setShowAddForm(false); }} aria-label="Закрыть">×</button></div>
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
          <div className="favorites-panel-heading"><span>{t('myStops')}</span><small>{favoriteIds.length} · {t('favorites').toLocaleUpperCase(localeCode)}</small></div>
          {favoriteIds.length === 0 ? <div className="favorites-empty">{t('favoritesEmpty')}</div> :
            favoriteIds.map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
              <button className="favorites-row" key={stop.id} onClick={() => { setActiveTab('map'); selectStop(stop); }}>
                <span className="favorites-star">★</span><span className="favorites-name">{stop.name}</span><small>{stop.routes?.slice(0, 4).join(' · ') || 'Остановка'}</small><b>↗</b>
              </button>
            ))}
        </aside>
      )}

      <nav className="bottom-nav" aria-label={t('mapTab')}>
        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => { setActiveTab('map'); setSelectedStop(null); setSearchOpen(false); }}><span>⌖</span><small>{t('mapTab')}</small></button>
        <button className={activeTab === 'favorites' ? 'active' : ''} onClick={() => { setActiveTab('favorites'); setSelectedStop(null); setSearchOpen(false); }}><span>☆</span><small>{t('favoritesTab')}</small></button>
        <button onClick={() => { setProfileNameDraft(profileName); setShowProfile(true); }}><span>◉</span><small>{t('profile')}</small></button>
      </nav>

      
    </main>
  );
}

export default App;

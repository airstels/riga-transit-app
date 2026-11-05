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
  loadingSchedule: { ru: 'Загружаем расписание остановки…', lv: 'Ielādē pieturas sarakstu…', en: 'Loading stop timetable…' },
  scheduleError: { ru: 'Не удалось загрузить расписание. Проверьте соединение и откройте остановку ещё раз.', lv: 'Neizdevās ielādēt sarakstu. Pārbaudiet savienojumu un atveriet pieturu vēlreiz.', en: 'Could not load the timetable. Check your connection and reopen the stop.' },
  noDepartures: { ru: 'Для этой остановки нет опубликованных отправлений.', lv: 'Šai pieturai nav publicētu reisu.', en: 'No published departures for this stop.' },
  calendarLoading: { ru: 'Проверяем дни и календарь движения…', lv: 'Pārbauda kustības kalendāru…', en: 'Checking service calendar…' },
  noTodayTrips: { ru: 'На выбранную дату отправлений не найдено.', lv: 'Izvēlētajā datumā reisi nav atrasti.', en: 'No departures found for the selected date.' },
  favoritesEmpty: { ru: 'Пока нет избранных остановок. Открой карточку остановки и нажми ☆.', lv: 'Izlasē vēl nav pieturu. Atver pieturas kartīti un nospied ☆.', en: 'No favorite stops yet. Open a stop card and tap ☆.' },
  stopSingular: { ru: 'Остановка общественного транспорта', lv: 'Sabiedriskā transporta pietura', en: 'Public transport stop' },
  scheduleLoadingFull: { ru: 'Загружаем полное расписание…', lv: 'Ielādē pilnu kustības sarakstu…', en: 'Loading full timetable…' },
  scheduleRetry: { ru: 'Не удалось загрузить расписание. Проверьте соединение и попробуйте снова.', lv: 'Neizdevās ielādēt sarakstu. Pārbaudiet savienojumu un mēģiniet vēlreiz.', en: 'Could not load the timetable. Check your connection and try again.' },
  calendarError: { ru: 'Календарь движения временно недоступен.', lv: 'Kustības kalendārs pašlaik nav pieejams.', en: 'Service calendar is temporarily unavailable.' },
  noSelectedType: { ru: 'Нет рейсов выбранного типа в ближайшие 24 часа.', lv: 'Tuvāko 24 stundu laikā nav izvēlētā transporta veida reisu.', en: 'No departures of this type in the next 24 hours.' },
  noUpcoming: { ru: 'В ближайшие 24 часа плановых отправлений не найдено.', lv: 'Tuvāko 24 stundu laikā plānotie reisi nav atrasti.', en: 'No scheduled departures found in the next 24 hours.' },
  routePatternLoading: { ru: 'Загружаем маршрут и остановки…', lv: 'Ielādē maršrutu un pieturas…', en: 'Loading route and stops…' },
  routePatternError: { ru: 'Не удалось загрузить схему маршрута. Попробуйте открыть её ещё раз.', lv: 'Neizdevās ielādēt maršruta shēmu. Mēģiniet vēlreiz.', en: 'Could not load route map. Please try again.' },
  routePatternMissing: { ru: 'Для этого направления схема остановок в опубликованных данных не найдена.', lv: 'Publicētajos datos šim virzienam pieturu shēma nav atrasta.', en: 'No stop sequence was found for this direction in the published data.' },
  routeDirection: { ru: 'Направление', lv: 'Virziens', en: 'Direction' },
  reportsTitle: { ru: 'Сообщения сообщества', lv: 'Kopienas ziņojumi', en: 'Community reports' },
  localTwoHours: { ru: 'локально · актуально 2 часа', lv: 'lokāli · derīgi 2 stundas', en: 'local · valid for 2 hours' },
  noReports: { ru: 'Пока нет сообщений', lv: 'Pagaidām nav ziņojumu', en: 'No reports yet' },
  addFirstReport: { ru: 'Добавь первое наблюдение об этой остановке', lv: 'Pievienojiet pirmo novērojumu par šo pieturu', en: 'Add the first observation for this stop' },
  close: { ru: 'Закрыть', lv: 'Aizvērt', en: 'Close' },
  mapZoom: { ru: 'Управление масштабом карты', lv: 'Kartes mēroga vadība', en: 'Map zoom controls' },
  zoomIn: { ru: 'Приблизить карту', lv: 'Tuvināt karti', en: 'Zoom in' },
  zoomOut: { ru: 'Отдалить карту', lv: 'Tālināt karti', en: 'Zoom out' },
  routes: { ru: 'Маршруты', lv: 'Maršruti', en: 'Routes' },
  favoriteStops: { ru: 'ИЗБРАННОЕ', lv: 'IZLASE', en: 'FAVORITES' },
  stopShort: { ru: 'Остановка', lv: 'Pietura', en: 'Stop' },
  directionUnknown: { ru: 'Направление не указано', lv: 'Virziens nav norādīts', en: 'Direction not specified' },
  now: { ru: 'сейчас', lv: 'tagad', en: 'now' },
  minutesShort: { ru: 'мин', lv: 'min', en: 'min' },
  hoursShort: { ru: 'ч', lv: 'h', en: 'h' },
  collapse: { ru: 'Свернуть', lv: 'Sakļaut', en: 'Collapse' },
  moreTrips: { ru: 'Ещё', lv: 'Vēl', en: 'More' },
  routeSearchLabel: { ru: 'Поиск по расписанию', lv: 'Meklēt kustības sarakstā', en: 'Search timetable' },
  dateLabel: { ru: 'Дата расписания', lv: 'Saraksta datums', en: 'Timetable date' },
  routeOpen: { ru: 'Открыть маршрут', lv: 'Atvērt maršrutu', en: 'Open route' },
  removeFavorite: { ru: 'Убрать из избранного', lv: 'Noņemt no izlases', en: 'Remove from favorites' },
  addFavorite: { ru: 'Добавить в избранное', lv: 'Pievienot izlasei', en: 'Add to favorites' },
  community: { ru: 'Сообщения сообщества', lv: 'Kopienas ziņojumi', en: 'Community reports' },
  localFresh: { ru: 'локально · актуально 2 часа', lv: 'lokāli · aktuāli 2 stundas', en: 'local · current for 2 hours' },
  addObservation: { ru: '＋ Добавить наблюдение', lv: '＋ Pievienot ziņojumu', en: '＋ Add a report' },
  whatHappens: { ru: 'Что происходит на остановке?', lv: 'Kas notiek pieturā?', en: 'What is happening at the stop?' },
  commentPlaceholder: { ru: 'Комментарий до 160 символов (необязательно)', lv: 'Komentārs līdz 160 rakstzīmēm (neobligāti)', en: 'Comment up to 160 characters (optional)' },
  cancel: { ru: 'Отмена', lv: 'Atcelt', en: 'Cancel' },
  publish: { ru: 'Опубликовать', lv: 'Publicēt', en: 'Publish' },
  anonymous: { ru: 'Аноним', lv: 'Anonīms', en: 'Anonymous' },
  check: { ru: 'Проверка', lv: 'Pārbaude', en: 'Check' },
  crowded: { ru: 'Переполнен', lv: 'Pārpildīts', en: 'Crowded' },
  delay: { ru: 'Задержка', lv: 'Kavēšanās', en: 'Delay' },
  empty: { ru: 'Свободно', lv: 'Brīvs', en: 'Not crowded' },
  other: { ru: 'Другое', lv: 'Cits', en: 'Other' },
  browserGeo: { ru: 'Браузер не поддерживает геолокацию', lv: 'Pārlūks neatbalsta atrašanās vietas noteikšanu', en: 'Your browser does not support geolocation' },
  allowGeo: { ru: 'Разреши доступ к геолокации в настройках браузера', lv: 'Atļauj piekļuvi atrašanās vietai pārlūka iestatījumos', en: 'Allow location access in your browser settings' },
  geoTimeout: { ru: 'Не удалось определить местоположение вовремя', lv: 'Neizdevās laikus noteikt atrašanās vietu', en: 'Location request timed out' },
  geoUnavailable: { ru: 'Местоположение временно недоступно', lv: 'Atrašanās vieta īslaicīgi nav pieejama', en: 'Location is temporarily unavailable' },
  radarExpires: { ru: 'ДЕЙСТВУЕТ 1 ЧАС', lv: 'DERĪGS 1 STUNDU', en: 'ACTIVE FOR 1 HOUR' },
  radarFilter: { ru: 'Фильтр сообщений Radar', lv: 'Radar ziņojumu filtrs', en: 'Radar report filter' },
  radarStops: { ru: 'Остановки', lv: 'Pieturas', en: 'Stops' },
  radarVehicles: { ru: 'Транспорт', lv: 'Transports', en: 'Vehicles' },
  routeNumber: { ru: 'Номер маршрута', lv: 'Maršruta numurs', en: 'Route number' },
  vehicleNumber: { ru: 'Бортовой номер', lv: 'Transportlīdzekļa numurs', en: 'Vehicle fleet number' },
  radarScopeStop: { ru: 'Сообщение об остановке', lv: 'Ziņojums par pieturu', en: 'Stop report' },
  radarScopeVehicle: { ru: 'Сообщение о транспорте', lv: 'Ziņojums par transportu', en: 'Vehicle report' },
  radarIntro: { ru: 'Отметьте состояние остановки или транспортного средства. Сообщение автоматически исчезнет через час.', lv: 'Ziņojiet par pieturas vai transportlīdzekļa stāvokli. Ziņojums pazudīs pēc stundas.', en: 'Report a stop or vehicle condition. Reports automatically expire after one hour.' },
  confirmReport: { ru: 'Подтверждаю', lv: 'Apstiprinu', en: 'Confirm' },
  confirmed: { ru: 'Подтверждено', lv: 'Apstiprināts', en: 'Confirmed' },
  noReportsFiltered: { ru: 'Нет сообщений по выбранному фильтру', lv: 'Nav ziņojumu izvēlētajā filtrā', en: 'No reports for this filter' },
  radarLocalOnly: { ru: 'Пока сообщения хранятся только на этом устройстве. Общая карта для всех пользователей появится после подключения серверной синхронизации.', lv: 'Pašlaik ziņojumi tiek glabāti tikai šajā ierīcē. Kopīga karte būs pieejama pēc servera sinhronizācijas pieslēgšanas.', en: 'Reports are currently stored on this device only. Shared reports will require server-side sync.' },
  radarMapLabel: { ru: 'Сообщения на карте', lv: 'Ziņojumi kartē', en: 'Reports on map' },
  quickReport: { ru: 'Быстрое сообщение', lv: 'Ātrs ziņojums', en: 'Quick report' },
  radarComposerHint: { ru: 'Выберите остановку — она подсветится на карте. Сообщение будет привязано к выбранному месту и транспорту.', lv: 'Izvēlieties pieturu — tā tiks izcelta kartē. Ziņojums tiks piesaistīts izvēlētajai vietai un transportam.', en: 'Choose a stop to highlight it on the map. Your report will be linked to that stop and vehicle.' },
  reportDelay: { ru: 'Задержка', lv: 'Kavēšanās', en: 'Delay' },
  reportCrowded: { ru: 'Переполненность', lv: 'Pārpildīts', en: 'Crowded' },
  reportDisruption: { ru: 'Сбой движения', lv: 'Kustības traucējumi', en: 'Service disruption' },
  reportCleanliness: { ru: 'Чистота', lv: 'Tīrība', en: 'Cleanliness' },
  reportAccessibility: { ru: 'Доступность', lv: 'Pieejamība', en: 'Accessibility' },
  transportFilter: { ru: 'Фильтр транспорта', lv: 'Transporta filtrs', en: 'Transport filter' },
  stopPrefix: { ru: 'Остановка', lv: 'Pietura', en: 'Stop' },
  officialDataNote: { ru: 'Официальные данные Rīgas satiksme', lv: 'Rīgas satiksme oficiālie dati', en: 'Official Rīgas satiksme data' },
  passed: { ru: 'Прошёл', lv: 'Pagājis', en: 'Departed' },
  nextDeparture: { ru: 'Следующий рейс', lv: 'Nākamais reiss', en: 'Next departure' },
  scheduled: { ru: 'По расписанию', lv: 'Pēc saraksta', en: 'Scheduled' },
};

type ReportType = 'delay' | 'crowded' | 'disruption' | 'cleanliness' | 'accessibility' | 'verification';
type ReportScope = 'stop' | 'vehicle';
interface Report {
  id: string;
  stopId: string;
  type: ReportType;
  scope: ReportScope;
  routeNumber?: string;
  vehicleNumber?: string;
  text: string;
  time: string;
  createdAt?: number;
  user?: string;
  confirmations?: number;
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

function reportTypeLabel(type: ReportType, language: AppLanguage): string {
  const labels: Record<ReportType, Record<AppLanguage, string>> = {
    delay: { ru: 'Задержка', lv: 'Kavēšanās', en: 'Delay' },
    crowded: { ru: 'Переполненность', lv: 'Pārpildīts', en: 'Crowded' },
    disruption: { ru: 'Сбой движения', lv: 'Kustības traucējumi', en: 'Service disruption' },
    cleanliness: { ru: 'Чистота', lv: 'Tīrība', en: 'Cleanliness' },
    accessibility: { ru: 'Доступность', lv: 'Pieejamība', en: 'Accessibility' },
    verification: { ru: 'Проверка информации', lv: 'Informācijas pārbaude', en: 'Information check' },
  };
  return labels[type][language];
}

function transportType(type: string, language: AppLanguage = 'ru'): string {
  const labels: Record<string, Record<AppLanguage, string>> = {
    '0': { ru: 'Трамвай', lv: 'Tramvajs', en: 'Tram' },
    '11': { ru: 'Троллейбус', lv: 'Trolejbuss', en: 'Trolleybus' },
    '2': { ru: 'Поезд', lv: 'Vilciens', en: 'Train' },
    '4': { ru: 'Паром', lv: 'Prāmis', en: 'Ferry' },
    '3': { ru: 'Автобус', lv: 'Autobuss', en: 'Bus' },
  };
  return labels[type]?.[language] ?? labels['3'][language];
}

function minutesUntil(date: Date, now: number): number { return Math.max(0, Math.ceil((date.getTime() - now) / 60000)); }

function formatRelativeMinutes(minutes: number, language: AppLanguage): string {
  if (minutes < 1) return language === 'ru' ? 'сейчас' : language === 'lv' ? 'tagad' : 'now';
  if (language === 'en') return `in ${minutes} min`;
  if (language === 'lv') return `pēc ${minutes} min`;
  return `через ${minutes} мин`;
}



function transportIcon(type: string): string {
  if (type === '0') return '🚋';
  if (type === '11') return '🚎';
  if (type === '2') return '🚆';
  if (type === '4') return '⛴';
  return '🚌';
}

function departureDayLabel(date: Date, now: number, language: AppLanguage = 'ru'): string {
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (language === 'lv') return isTomorrow ? 'rīt' : 'šodien';
  if (language === 'en') return isTomorrow ? 'tomorrow' : 'today';
  return isTomorrow ? 'завтра' : 'сегодня';
}

function formatDeparture(date: Date, now: number, locale = 'ru-RU', language: AppLanguage = 'ru'): string {
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `${time} · ${departureDayLabel(date, now, language)}`;
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
const REPORT_TTL_MS = 60 * 60 * 1000;
const REPORT_TYPES: { id: ReportType; label: string; color: string; dot: string }[] = [
  { id: 'delay', label: 'Задержка', color: 'bg-yellow-500/20 text-yellow-300', dot: '#eab308' },
  { id: 'crowded', label: 'Переполненность', color: 'bg-orange-500/20 text-orange-300', dot: '#f97316' },
  { id: 'disruption', label: 'Сбой движения', color: 'bg-red-500/20 text-red-300', dot: '#ef4444' },
  { id: 'cleanliness', label: 'Чистота', color: 'bg-sky-500/20 text-sky-300', dot: '#38bdf8' },
  { id: 'accessibility', label: 'Доступность', color: 'bg-emerald-500/20 text-emerald-300', dot: '#10b981' },
  { id: 'verification', label: 'Проверка информации', color: 'bg-violet-500/20 text-violet-300', dot: '#a78bfa' },
];
function isReport(value: unknown): value is Report {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' &&
    typeof item.stopId === 'string' &&
    REPORT_TYPES.some(type => type.id === item.type) &&
    (item.scope === 'stop' || item.scope === 'vehicle') &&
    (item.routeNumber === undefined || typeof item.routeNumber === 'string') &&
    (item.vehicleNumber === undefined || typeof item.vehicleNumber === 'string') &&
    typeof item.text === 'string' &&
    typeof item.time === 'string' &&
    (item.createdAt === undefined || typeof item.createdAt === 'number') &&
    (item.user === undefined || typeof item.user === 'string') &&
    (item.confirmations === undefined || typeof item.confirmations === 'number');
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
function MapZoomControl({ language }: { language: AppLanguage }) {
  const map = useMap();
  const labels = language === 'ru'
    ? ['Управление масштабом карты', 'Приблизить карту', 'Отдалить карту']
    : language === 'lv'
      ? ['Kartes mēroga vadība', 'Tuvināt karti', 'Tālināt karti']
      : ['Map zoom controls', 'Zoom in', 'Zoom out'];
  return (
    <div className="zoom-control" aria-label={labels[0]}>
      <button onClick={() => map.zoomIn()} aria-label={labels[1]}>+</button>
      <span />
      <button onClick={() => map.zoomOut()} aria-label={labels[2]}>−</button>
    </div>
  );
}

function App() {
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [quickStopQuery, setQuickStopQuery] = useState('');
  const [scheduleCompactOpen, setScheduleCompactOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('delay');
  const [reportScope, setReportScope] = useState<ReportScope>('stop');
  const [reportRouteNumber, setReportRouteNumber] = useState('');
  const [reportVehicleNumber, setReportVehicleNumber] = useState('');
  const [reportText, setReportText] = useState('');
  const [radarFilter, setRadarFilter] = useState<'all' | 'stop' | 'vehicle'>('all');
  const [confirmedReportIds, setConfirmedReportIds] = useState<string[]>([]);
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
      const rawConfirmed = JSON.parse(localStorage.getItem('riga-confirmed-reports') ?? '[]');
      if (Array.isArray(rawConfirmed)) setConfirmedReportIds(rawConfirmed.filter((id): id is string => typeof id === 'string'));
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


  const activeReports = useMemo(() => reports.filter(report => report.createdAt !== undefined && scheduleClock - report.createdAt < REPORT_TTL_MS), [reports, scheduleClock]);
  const radarStopGroups = useMemo(() => {
    const groups = new Map<string, Report[]>();
    activeReports.filter(report => radarFilter === 'all' || report.scope === radarFilter).forEach(report => {
      const list = groups.get(report.stopId) ?? [];
      list.push(report);
      groups.set(report.stopId, list);
    });
    return Array.from(groups.entries()).map(([stopId, items]) => ({
      stop: activeStops.find(stop => stop.id === stopId),
      reports: items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    })).filter((item): item is { stop: Stop; reports: Report[] } => Boolean(item.stop));
  }, [activeReports, radarFilter]);

  const selectedReports = useMemo(() => selectedStop
    ? activeReports.filter(report => report.stopId === selectedStop.id && (radarFilter === 'all' || report.scope === radarFilter)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8)
    : [], [activeReports, selectedStop, radarFilter]);

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
      setGpsError(t('browserGeo'));
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
          ? t('allowGeo')
          : error.code === error.TIMEOUT ? t('geoTimeout') : t('geoUnavailable'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const confirmReport = (report: Report) => {
    if (confirmedReportIds.includes(report.id)) return;
    const nextConfirmed = [...confirmedReportIds, report.id];
    setConfirmedReportIds(nextConfirmed);
    try { localStorage.setItem('riga-confirmed-reports', JSON.stringify(nextConfirmed.slice(-300))); } catch (error) { console.warn('Could not save report confirmation', error); }
    persistReports(reports.map(item => item.id === report.id ? { ...item, confirmations: (item.confirmations ?? 0) + 1 } : item));
  };

  const openQuickReport = () => { setQuickReportOpen(true); setQuickStopQuery(''); setReportScope('vehicle'); setReportType('delay'); setReportText(''); setReportRouteNumber(''); setReportVehicleNumber(''); };

  const addReport = () => {
    if (!selectedStop) return;
    const now = Date.now();
    if (reportScope === 'vehicle' && (!/^\d{4,5}$/.test(reportVehicleNumber.trim()) || !reportRouteNumber.trim())) return;
    const report: Report = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      stopId: selectedStop.id,
      type: reportType,
      scope: reportScope,
      routeNumber: reportScope === 'vehicle' && reportRouteNumber.trim() ? reportRouteNumber.trim().slice(0, 4) : undefined,
      vehicleNumber: reportScope === 'vehicle' ? reportVehicleNumber.trim() : undefined,
      text: reportText.trim().slice(0, 160),
      time: new Date(now).toLocaleString(localeCode, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: now,
      user: user?.first_name ? [user.first_name, user.last_name].filter(Boolean).join(' ') : t('anonymous'),
      confirmations: 0,
    };
    persistReports([report, ...reports]);
    setShowAddForm(false);
    setReportText('');
    setReportType('delay');
    setReportScope('stop');
    setReportRouteNumber('');
    setReportVehicleNumber('');
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
        <MapZoomControl language={language} />
        <MapFocus target={mapTarget} />
        {showStopMarkers && <StopLayer stops={activeStops} selectedStop={selectedStop} onSelect={selectStop} />}
        {radarStopGroups.map(({ stop, reports: stopReports }) => {
          const latest = stopReports[0];
          const type = REPORT_TYPES.find(item => item.id === latest.type);
          return <CircleMarker key={stop.id} center={[stop.lat, stop.lon]} radius={Math.min(13 + stopReports.length * 1.5, 20)}
            pathOptions={{ color: type?.dot ?? '#d9b979', fillColor: type?.dot ?? '#d9b979', fillOpacity: 0.82, weight: 2, className: 'radar-pulse-marker' }}
            eventHandlers={{ click: () => selectStop(stop) }}>
            <></>
          </CircleMarker>;
        })}
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
            <button className="user-chip profile-trigger" onClick={() => { setProfileNameDraft(profileName); setShowProfile(true); }} aria-label={t('profile')}>{user?.photo_url ? <img className="profile-trigger-photo" src={user.photo_url} alt="" /> : <span className="profile-trigger-avatar">{(profileName || user?.first_name || "R").slice(0,1).toLocaleUpperCase(localeCode)}</span>}<span>{t('profile')}</span><span className="profile-trigger-chevron">↗</span></button>
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
                  <span><strong>{stop.name}</strong><small>{stop.routes?.length ? `${t('routes')}: ${stop.routes.join(', ')}` : t('stopSingular')}</small></span>
                  <span className="result-arrow">↗</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && !search.trim() && (favoriteIds.length > 0 || recentIds.length > 0) && (
            <div className="quick-access">
              {favoriteIds.length > 0 && <div className="quick-group">
                <div className="quick-heading"><span>{t('favoriteStops')}</span><span>★ {favoriteIds.length}</span></div>
                {favoriteIds.slice(0, 5).map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-star">★</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || t('stopSingular')}</small></button>
                ))}
              </div>}
              {recentIds.length > 0 && <div className="quick-group">
                <div className="quick-heading"><span>{t('recentLabel')}</span><span>{t('latest')}</span></div>
                {recentIds.slice(0, 4).map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
                  <button key={stop.id} className="quick-row" onClick={() => selectStop(stop)}><span className="quick-recent">↺</span><span className="quick-name">{stop.name}</span><small>{stop.routes?.slice(0, 3).join(' · ') || t('stopShort')}</small></button>
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
              <div><div className="panel-eyebrow">{t('personalSpace')}</div><span className="profile-kicker">{language === 'ru' ? 'ВАШ ГОРОД · ВАШИ МАРШРУТЫ' : language === 'lv' ? 'JŪSU PILSĒTA · JŪSU MARŠRUTI' : 'YOUR CITY · YOUR ROUTES'}</span></div>
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
          {activeReports.length > 0 && <button className="radar-map-summary" onClick={() => {
            const firstStop = radarStopGroups[0]?.stop;
            if (firstStop) { setRadarFilter('all'); selectStop(firstStop); }
          }}><i /> <strong>{activeReports.length}</strong> {t('radarMapLabel')}</button>}
          <button className="radar-add-main" onClick={openQuickReport}><span>＋</span><strong>{t('quickReport')}</strong></button>
          <button className="map-action gps-button" onClick={locateMe} disabled={gpsState === 'loading'}>
            <span>{gpsState === 'loading' ? '…' : '◎'}</span>
            {gpsState === 'loading' ? t('locating') : t('whereAmI')}
          </button>
        </div>
      )}

      {quickReportOpen && <div className="radar-composer-backdrop" onClick={() => setQuickReportOpen(false)}>
        <section className="radar-composer glass" role="dialog" aria-modal="true" aria-labelledby="radar-composer-title" onClick={event => event.stopPropagation()}>
          <div className="radar-composer-head"><div><div className="panel-eyebrow">COMMUNITY RADAR</div><h2 id="radar-composer-title">{t('quickReport')}</h2></div><button className="close-sheet" onClick={() => setQuickReportOpen(false)} aria-label={t('close')}>×</button></div>
          <div className="radar-step"><span>1</span><label>{t('vehicleNumber')}</label></div>
          <div className="radar-vehicle-fields"><label><span>{t('routeNumber')}</span><input value={reportRouteNumber} onChange={event => setReportRouteNumber(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="11" /></label><label><span>{t('vehicleNumber')}</span><input value={reportVehicleNumber} onChange={event => setReportVehicleNumber(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="12345" /></label></div>
          <div className="radar-step"><span>2</span><label>{t('searchStop')}</label></div>
          <input className="radar-stop-search" value={quickStopQuery} onChange={event => setQuickStopQuery(event.target.value)} placeholder={t('searchPlaceholder')} autoFocus />
          <div className="radar-stop-results">
            {(quickStopQuery.trim()
              ? activeStops.filter(stop =>
                  stop.name.toLocaleLowerCase(localeCode).includes(quickStopQuery.trim().toLocaleLowerCase(localeCode)) ||
                  stop.routes?.some(route => route.includes(quickStopQuery.trim()))
                ).slice(0, 6)
              : []
            ).map(stop => (
              <button key={stop.id} onClick={() => {
                setSelectedStop(stop);
                setMapTarget({ lat: stop.lat, lon: stop.lon });
                setSearch(stop.name);
                setQuickReportOpen(false);
                setShowAddForm(true);
                setReportScope('vehicle');
              }}>
                <span className="result-pin">●</span>
                <span><strong>{stop.name}</strong><small>{stop.routes?.length ? '№ ' + stop.routes.join(' · ') : t('stopSingular')}</small></span>
                <b>↗</b>
              </button>
            ))}
            {quickStopQuery.trim() && !activeStops.some(stop => stop.name.toLocaleLowerCase(localeCode).includes(quickStopQuery.trim().toLocaleLowerCase(localeCode))) && <small>{t('nothingFound')}</small>}
          </div>
          <div className="radar-composer-note">{t('radarComposerHint')}</div>
        </section>
      </div>}

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
        <section className={scheduleViewOpen ? "stop-sheet glass schedule-open" : "stop-sheet glass"} aria-label={t('stopPrefix') + ' ' + selectedStop.name}>
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
                  <button className="schedule-compact-toggle" onClick={() => setScheduleCompactOpen(value => !value)} aria-expanded={scheduleCompactOpen}><span>{t('departures')}</span><small>{scheduleCompactOpen ? '⌃' : '⌄'}</small></button>
                  <div>
                    <div className="schedule-heading"><span>{t('departures')}</span><small>{t('officialSchedule')}</small></div>
                    <div className="schedule-subtitle">{t('nearestDepartures')}</div>
                  </div>
                  <span className="schedule-live-dot" aria-label={t('officialSchedule')} />
                </div>
                {!scheduleCompactOpen && <>
                <div className="schedule-filter" role="group" aria-label={t('all')}>
                  {[{id:'all',label:t('all')}, {id:'3',label:t('buses')}, {id:'11',label:t('trolleybuses')}, {id:'0',label:t('trams')}].map(filter => (
                    <button key={filter.id} className={scheduleTransportFilter === filter.id ? 'active' : ''} onClick={() => setScheduleTransportFilter(filter.id)}>{filter.label}</button>
                  ))}
                </div>
                {!scheduleViewOpen && <div className="schedule-open-row">
                  <div><strong>{t('fullDay')}</strong><small>{t('allTrips')}</small></div>
                  <button onClick={() => { setScheduleDateOffset(0); setScheduleSearch(''); setSelectedRouteDetail(null); setScheduleViewOpen(true); }}>{t('open')} <span>↗</span></button>
                </div>}
                {scheduleStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />{t('loadingSchedule')}</div>}
                {scheduleStatus === 'error' && <div className="schedule-state">{t('scheduleError')}</div>}
                {scheduleStatus === 'empty' && <div className="schedule-state">{t('noDepartures')}</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'loading' && <div className="schedule-state">{t('calendarLoading')}</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'error' && <div className="schedule-state">{t('calendarError')}</div>}
                {scheduleStatus === 'ready' && calendarStatus === 'ready' && visibleDepartures.length === 0 && <div className="schedule-state">{upcomingDepartures.length ? t('noSelectedType') : t('noUpcoming')}</div>}
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
                        <span className="schedule-route-copy"><strong>{group.headsign || group.routeName || t('directionUnknown')}</strong><small>{transportType(group.routeType, language)}{group.routeName ? ' · ' + group.routeName : ''}</small></span>
                        <span className="schedule-next">
                          <strong>{first ? first.toLocaleTimeString(localeCode, {hour:'2-digit', minute:'2-digit'}) : '—'}</strong>
                          <small>{first ? departureDayLabel(first, scheduleClock, language) + ' · ' : ''}{formatRelativeMinutes(minutes, language)}</small>
                        </span>
                      </div>
                      <div className="schedule-times">
                        {shown.map((departure, index) => <span className={index === 0 ? 'schedule-time next' : 'schedule-time'} key={departure.toISOString()}>
                          <strong>{formatDeparture(departure, scheduleClock, localeCode, language)}</strong>
                          {index === 0 && <small>{formatRelativeMinutes(minutes, language)}</small>}
                        </span>)}
                      </div>
                      <div className="schedule-card-actions">
                        {group.departures.length > 3 && <button className="schedule-expand" onClick={() => setExpandedScheduleRoutes(current => expanded ? current.filter(key => key !== group.key) : [...current, group.key])}>
                          {expanded ? t('collapse') : t('moreTrips') + ' ' + (group.departures.length - 3) + ' ' + (language === 'ru' ? 'рейсов' : language === 'lv' ? 'reisi' : 'departures')} <span>{expanded ? '⌃' : '⌄'}</span>
                        </button>}
                        <button className="schedule-route-detail-link" onClick={() => { setScheduleDateOffset(0); setSelectedRouteDetail(group); setScheduleViewOpen(true); }}>{t('route')} <span>↗</span></button>
                      </div>
                    </article>
                  );
                })}

                {scheduleViewOpen && <div className="full-schedule-view">
                  <div className="full-schedule-toolbar">
                    <div><strong>{t('fullSchedule')}</strong><small>{selectedStop.name} · {t('allDepartures')}</small></div>
                    <button onClick={() => { setScheduleViewOpen(false); setSelectedRouteDetail(null); setScheduleSearch(''); }} aria-label={t('close')}>×</button>
                  </div>
                  {scheduleStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />{t('scheduleLoadingFull')}</div>}
                  {scheduleStatus === 'error' && <div className="schedule-state">{t('scheduleRetry')}</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'loading' && <div className="schedule-state">{t('calendarLoading')}</div>}
                  {scheduleStatus === 'ready' && calendarStatus === 'error' && <div className="schedule-state">{t('calendarError')}</div>}
                  <label className="schedule-search">
                    <span>⌕</span>
                    <input value={scheduleSearch} onChange={event => setScheduleSearch(event.target.value)} placeholder={t('routeSearch')} aria-label={t('routeSearchLabel')} />
                    {scheduleSearch && <button onClick={() => setScheduleSearch('')} aria-label={t('clearSearch')}>×</button>}
                  </label>
                  <div className="schedule-results-count">{visibleFullDayDepartures.length} {visibleFullDayDepartures.length === 1 ? t('routeDirection') : t('directionCount')} · {visibleFullDayDepartures.reduce((sum, group) => sum + group.departures.length, 0)} {t('departureCount')}</div>
                  <div className="schedule-date-tabs" role="group" aria-label={t('dateLabel')}>
                    <button className={scheduleDateOffset === 0 ? 'active' : ''} onClick={() => setScheduleDateOffset(0)}>{t('today')}</button>
                    <button className={scheduleDateOffset === 1 ? 'active' : ''} onClick={() => setScheduleDateOffset(1)}>{t('tomorrow')}</button>
                    <span>{selectedScheduleDate.toLocaleDateString(localeCode, { day: 'numeric', month: 'long', weekday: 'short' })}</span>
                  </div>
                  {scheduleStatus === 'ready' && calendarStatus === 'ready' && visibleFullDayDepartures.length === 0 && <div className="schedule-state">{t('noTodayTrips')}</div>}
                  {selectedRouteDetail ? (
                    <section className="route-detail-view">
                      <button className="route-detail-back" onClick={() => setSelectedRouteDetail(null)}>{t('allRoutes')}</button>
                      <div className="route-detail-title">
                        <span className={'schedule-vehicle-icon type-' + selectedRouteDetail.routeType}>{transportIcon(selectedRouteDetail.routeType)}</span>
                        <span className="schedule-route-number">{selectedRouteDetail.route}</span>
                        <span><strong>{selectedRouteDetail.headsign || selectedRouteDetail.routeName}</strong><small>{transportType(selectedRouteDetail.routeType, language)} · {selectedRouteDetail.headsign || t('routeDirection')}</small></span>
                      </div>
                      <div className="route-detail-caption">{t('routeStops')}</div>
                      {routePatternsStatus === 'loading' && <div className="schedule-state"><span className="schedule-spinner" />{t('routePatternLoading')}</div>}
                      {routePatternsStatus === 'error' && <div className="schedule-state">{t('routePatternError')}</div>}
                      {routePatternsStatus === 'ready' && (() => {
                        const pattern = routePatterns?.find(item => item.route === selectedRouteDetail.route && item.headsign === selectedRouteDetail.headsign && item.directionId === selectedRouteDetail.directionId);
                        if (!pattern) return <div className="schedule-state">{t('routePatternMissing')}</div>;
                        return <ol className="route-stop-list">
                          {pattern.stops.map((item, index) => {
                            const stop = activeStops.find(candidate => candidate.id === item.stopId);
                            const isCurrent = item.stopId === selectedStop.id;
                            return <li className={isCurrent ? 'current' : ''} key={item.stopId + '-' + item.sequence}>
                              <span className="route-stop-marker">{index + 1}</span>
                              <span className="route-stop-name">{stop?.name || t('stopPrefix') + ' ' + item.stopId}{isCurrent && <small>{t('youAreHere')}</small>}</span>
                            </li>;
                          })}
                        </ol>;
                      })()}
                    </section>
                  ) : visibleFullDayDepartures.map(group => <article className="full-route-group" key={group.key}>
                    <button className="full-route-heading route-open-button" onClick={() => setSelectedRouteDetail(group)} aria-label={t('routeOpen') + ' ' + group.route + ', ' + group.headsign}>
                      <span className={'schedule-vehicle-icon type-' + group.routeType}>{transportIcon(group.routeType)}</span>
                      <span className="schedule-route-number">{group.route}</span>
                      <span className="full-route-copy"><strong>{group.headsign || group.routeName || t('directionUnknown')}</strong><small>{transportType(group.routeType, language)} · {group.departures.length} {language === 'ru' ? 'рейсов' : language === 'lv' ? 'reisi' : 'trips'}</small></span>
                      <span className="route-open-chevron">›</span>
                    </button>
                    <div className="full-departure-list">
                      {group.departures.map(departure => {
                        const passed = departure.getTime() < scheduleClock;
                        const isNext = !passed && !group.departures.some(item => item.getTime() >= scheduleClock && item.getTime() < departure.getTime());
                        return <div className={passed ? 'full-departure passed' : isNext ? 'full-departure next' : 'full-departure'} key={departure.toISOString()}>
                          <strong>{departure.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' })}</strong>
                          <small>{passed ? t('passed') : isNext ? t('nextDeparture') : t('scheduled')}</small>
                        </div>;
                      })}
                    </div>
                  </article>)}
                  <div className="schedule-footnote"><span>ⓘ</span> {t('plannedTimes')}</div>
                </>}
                </div>}
                <div className="schedule-footnote"><span>ⓘ</span> {t('plannedTimes')}</div>
              </div>
            </div>
            <div className="sheet-actions"><button className={"favorite-toggle " + (favoriteIds.includes(selectedStop.id) ? "is-favorite" : "")} onClick={() => toggleFavorite(selectedStop)} aria-label={favoriteIds.includes(selectedStop.id) ? t('removeFavorite') : t('addFavorite')} title={favoriteIds.includes(selectedStop.id) ? t('removeFavorite') : t('addFavorite')}>{favoriteIds.includes(selectedStop.id) ? "★" : "☆"}</button><button className="close-sheet" onClick={() => { setSelectedStop(null); setSelectedRouteDetail(null); setScheduleViewOpen(false); setShowAddForm(false); }} aria-label={t('close')}>×</button></div>
          </div>

          <div className="reports-heading"><span>{t('reportsTitle')}</span><span className="local-label">{t('radarExpires')}</span></div>
          <div className="radar-filter" role="group" aria-label={t('radarFilter')}>
            {([{id:'all',label:t('all')},{id:'stop',label:t('radarStops')},{id:'vehicle',label:t('radarVehicles')}] as const).map(item => <button key={item.id} className={radarFilter === item.id ? 'active' : ''} onClick={() => setRadarFilter(item.id)}>{item.label}</button>)}
          </div>
          <div className="reports-list">
            {selectedReports.length === 0 ? (
              <div className="empty-reports"><span>◌</span><p>{t('noReports')}</p><small>{radarFilter === 'all' ? t('addFirstReport') : t('noReportsFiltered')}</small></div>
            ) : selectedReports.map(report => {
              const type = REPORT_TYPES.find(item => item.id === report.type);
              return <article className="report-card" key={report.id}>
                <div className="report-meta"><span className={`report-tag ${type?.color ?? ''}`}>{type ? reportTypeLabel(type.id, language) : t('other')}</span><time>{report.time}</time></div>
                {report.scope === 'vehicle' && <div className="radar-vehicle-line"><strong>№ {report.routeNumber}</strong><span>{t('vehicleNumber')} {report.vehicleNumber}</span></div>}
                {report.text && <p>{report.text}</p>}
                <div className="radar-report-footer"><small>{report.user ?? t('anonymous')} · {Math.max(0, Math.ceil((REPORT_TTL_MS - (scheduleClock - (report.createdAt ?? scheduleClock))) / 60000))} {t('minutesShort')}</small><button disabled={confirmedReportIds.includes(report.id)} onClick={() => confirmReport(report)}>{confirmedReportIds.includes(report.id) ? t('confirmed') : t('confirmReport')} · {report.confirmations ?? 0}</button></div>
              </article>;
            })}
          </div>

          {!showAddForm ? (
            <button className="primary-button" onClick={() => setShowAddForm(true)}>{t('addObservation')}</button>
          ) : (
            <div className="report-form">
              <div className="form-title">{t('whatHappens')}</div>
              <div className="radar-form-hint">{t('radarIntro')}</div>
              <div className="radar-scope-switch">
                <button className={reportScope === 'stop' ? 'active' : ''} onClick={() => setReportScope('stop')}>{t('radarStops')}</button>
                <button className={reportScope === 'vehicle' ? 'active' : ''} onClick={() => setReportScope('vehicle')}>{t('radarVehicles')}</button>
              </div>
              {reportScope === 'vehicle' && <div className="radar-vehicle-fields">
                <label><span>{t('routeNumber')}</span><input value={reportRouteNumber} onChange={event => setReportRouteNumber(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" maxLength={3} placeholder={language === 'ru' ? 'Например, 11' : language === 'lv' ? 'Piemēram, 11' : 'e.g. 11'} /></label>
                <label><span>{t('vehicleNumber')}</span><input value={reportVehicleNumber} onChange={event => setReportVehicleNumber(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" maxLength={5} placeholder="12345" /></label>
              </div>}
              <div className="report-type-grid">
                {REPORT_TYPES.map(type => (
                  <button key={type.id} onClick={() => setReportType(type.id)}
                    className={`report-type ${reportType === type.id ? 'selected' : ''}`}>
                    <i style={{ background: type.dot }} />{reportTypeLabel(type.id, language)}
                  </button>
                ))}
              </div>
              <input className="comment-input" value={reportText} maxLength={160}
                onChange={event => setReportText(event.target.value)} placeholder={t('commentPlaceholder')} />
              <div className="form-footer"><span>{reportText.length}/160</span>
                <button className="secondary-button" onClick={() => setShowAddForm(false)}>{t('cancel')}</button>
                <button className="primary-button compact" onClick={addReport} disabled={reportScope === 'vehicle' && (!/^\d{4,5}$/.test(reportVehicleNumber.trim()) || !reportRouteNumber.trim())}>{t('publish')}</button>
              </div>
            </div>
          )}
          <div className="radar-local-note"><span>ⓘ</span>{t('radarLocalOnly')}</div>
          <div className="data-note"><span className="data-check">✓</span> {t('officialDataNote')} · {gtfsMetadata.importedAt}</div>
        </section>
      )}

      {activeTab === 'favorites' && !selectedStop && (
        <aside className="favorites-panel glass">
          <div className="favorites-panel-heading"><span>{t('myStops')}</span><small>{favoriteIds.length} · {t('favorites').toLocaleUpperCase(localeCode)}</small></div>
          {favoriteIds.length === 0 ? <div className="favorites-empty">{t('favoritesEmpty')}</div> :
            favoriteIds.map(id => activeStops.find(stop => stop.id === id)).filter((stop): stop is Stop => Boolean(stop)).map(stop => (
              <button className="favorites-row" key={stop.id} onClick={() => { setActiveTab('map'); selectStop(stop); }}>
                <span className="favorites-star">★</span><span className="favorites-name">{stop.name}</span><small>{stop.routes?.slice(0, 4).join(' · ') || t('stopShort')}</small><b>↗</b>
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

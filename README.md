# Riga Transit — Telegram Mini App

Мобильная карта остановок Риги с поиском, геолокацией и локальными пользовательскими наблюдениями.

## Текущее состояние

- React 18 + TypeScript + Vite.
- Leaflet / OpenStreetMap CARTO dark basemap.
- Поиск по имеющемуся демонстрационному списку остановок.
- Определение текущей геопозиции через браузер Geolocation API (требует HTTPS и разрешения пользователя).
- Список трёх ближайших точек по прямому расстоянию.
- Карточка остановки и локальные сообщения: проверка, переполненность, задержка, свободно, другое.
- Telegram Mini App: вызовы ready/expand и чтение имени из initDataUnsafe для отображения интерфейса.

## Важные ограничения — не считать данными для поездки

Список из `src/data/stops.ts` — демонстрационные точки, не официальный каталог остановок. Номера линий и координаты не подтверждены актуальным GTFS. Поиск и расстояние работают только по этому списку. Геолокация не является GPS-трекингом в фоне.

Сообщения хранятся в localStorage только на текущем устройстве и не синхронизируются между пользователями. Имя Telegram используется только для подписи интерфейса; серверной проверки Telegram initData и серверной авторизации нет. Не публикуйте чувствительную информацию.

Приложение пока не строит маршруты, не показывает расписание и не получает положение транспорта в реальном времени. Не используйте его как замену официальному планировщику Rīgas satiksme.

## Разработка

```bash
npm install
npm run dev
npm run build
```

## Следующие технические этапы

1. Импортировать и валидировать официальный GTFS feed для остановок, маршрутов, поездок и календарей.
2. Реализовать поиск маршрутов на основе графа GTFS и расписания.
3. Подключить официально доступный realtime feed, если он предоставляется и разрешает такое использование.
4. Перенести сообщения в серверную БД, добавить проверку Telegram initData на сервере, rate limiting, модерацию и срок актуальности.
5. Добавить автоматические тесты расстояний, поиска, валидации сообщений и маршрутов.

Репозиторий: https://github.com/airstels/riga-transit-app


## Import official Rīgas satiksme GTFS stops

The agency publishes static public-transport schedules in GTFS format as open data (CC0 1.0). The frontend now prefers imported official stops and falls back to the clearly labelled demo catalogue until an import is performed.

1. Download the latest monthly GTFS ZIP from the [Rīgas satiksme open-data page](https://www.rigassatiksme.lv/lv/par-mums/publiskojama-informacija/atvertie-dati/) or [Latvian Open Data Portal](https://data.gov.lv/dati/lv/dataset/marsrutu-saraksti-rigas-satiksme-sabiedriskajam-transportam).
2. Run: \`python3 scripts/import_gtfs.py /path/to/gtfs.zip\`
3. Commit the generated \`src/data/gtfs-data.ts\` and deploy.

The importer reads \`stops.txt\`, \`routes.txt\`, \`trips.txt\`, and \`stop_times.txt\`; it validates coordinates, deduplicates stop IDs and associates published route names with each stop. It uses only Python's standard library.

**Scope note:** this first GTFS import enables official stop coordinates and route labels. It does not yet implement trip planning, transfers, live vehicle positions or arrival predictions. Those require a schedule-aware routing engine and, for live data, a supported real-time feed.

# Riga Transit — Telegram Mini App

Мобильная карта общественного транспорта Риги: остановки, поиск, геолокация и сообщения пассажиров.

## Текущее состояние

- React 18 + TypeScript + Vite.
- Leaflet + OpenStreetMap.
- Поиск по каталогу остановок и номерам маршрутов.
- Геолокация браузера и список ближайших остановок.
- Карточка остановки и сообщения сообщества.
- Telegram Mini App: ready/expand и отображение имени пользователя.

## Официальные данные

Rīgas satiksme публикует статический GTFS ежемесячно на Latvijas Atvērto datu portāls под лицензией CC0 1.0. Импортёр автоматически обнаруживает самый новый ZIP в CKAN API и формирует каталог остановок, маршрутов, поездок, времён по остановкам и календарей.

Автоматическая синхронизация запускается ежемесячно и доступна вручную через GitHub Actions → Sync official Rīgas satiksme GTFS → Run workflow. При изменении данных workflow создаёт commit в main, после чего Vercel публикует новую версию.

Данные в public/data/gtfs:
- stops.json — остановки и координаты.
- routes.json — маршруты.
- trips.json — поездки.
- stop_times.json — плановые времена прибытия/отправления.
- calendar.json и calendar_dates.json — дни действия расписаний.
- manifest.json — источник, дата импорта и счётчики.

Статический GTFS — плановое расписание, а не местоположение транспорта в реальном времени. Наличие realtime API Rīgas satiksme в проекте пока не подтверждено.

Сообщения сообщества пока хранятся в localStorage на устройстве и не синхронизируются между пассажирами. Telegram initDataUnsafe используется только для отображения имени, не для серверной аутентификации. Не публикуйте чувствительную информацию.

## Разработка

    npm install
    npm run dev
    npm run build
    npm run test:gtfs

Ручной импорт локального архива:

    python3 scripts/import_gtfs.py /path/to/gtfs.zip

Импорт последней версии с официального портала:

    python3 scripts/import_gtfs.py --latest

Репозиторий: https://github.com/airstels/riga-transit-app

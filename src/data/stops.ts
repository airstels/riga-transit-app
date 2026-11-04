export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes?: string[];
}

// Основные остановки центра Риги + популярные точки
// Позже можно заменить на полный GTFS
export const stops: Stop[] = [
  { id: "1", name: "Centrāltirgus", lat: 56.9445, lon: 24.1148, routes: ["3", "11", "22"] },
  { id: "2", name: "Stacijas laukums", lat: 56.9470, lon: 24.1205, routes: ["1", "2", "3", "11"] },
  { id: "3", name: "Brīvības bulvāris", lat: 56.9535, lon: 24.1180, routes: ["1", "11", "22"] },
  { id: "4", name: "Esplanāde", lat: 56.9550, lon: 24.1165, routes: ["1", "11"] },
  { id: "5", name: "Opera", lat: 56.9508, lon: 24.1115, routes: ["3", "11"] },
  { id: "6", name: "Nacionālā opera", lat: 56.9498, lon: 24.1105, routes: ["3"] },
  { id: "7", name: "Doma laukums", lat: 56.9492, lon: 24.1050, routes: [] },
  { id: "8", name: "Rātslaukums", lat: 56.9478, lon: 24.1065, routes: [] },
  { id: "9", name: "Kaļķu iela", lat: 56.9485, lon: 24.1080, routes: ["1", "11"] },
  { id: "10", name: "Grēcinieku iela", lat: 56.9465, lon: 24.1095, routes: ["3"] },
  { id: "11", name: "13. janvāra iela", lat: 56.9455, lon: 24.1120, routes: ["3", "11"] },
  { id: "12", name: "Autoosta", lat: 56.9450, lon: 24.1190, routes: ["22", "23"] },
  { id: "13", name: "Uzvaras parks", lat: 56.9420, lon: 24.1000, routes: ["3"] },
  { id: "14", name: "Āgenskalns", lat: 56.9380, lon: 24.0850, routes: ["3", "4"] },
  { id: "15", name: "Torņakalns", lat: 56.9350, lon: 24.0800, routes: ["3"] },
  { id: "16", name: "Ziepniekkalns", lat: 56.9200, lon: 24.0700, routes: ["3"] },
  { id: "17", name: "Imanta", lat: 56.9550, lon: 24.0100, routes: ["4", "21"] },
  { id: "18", name: "Zolitūde", lat: 56.9500, lon: 24.0000, routes: ["4"] },
  { id: "19", name: "Pļavnieki", lat: 56.9400, lon: 24.1800, routes: ["15", "18"] },
  { id: "20", name: "Purvciems", lat: 56.9600, lon: 24.1700, routes: ["15"] },
  { id: "21", name: "Mežciems", lat: 56.9700, lon: 24.1900, routes: ["15"] },
  { id: "22", name: "Jugla", lat: 56.9800, lon: 24.2000, routes: ["1"] },
  { id: "23", name: "Teika", lat: 56.9700, lon: 24.1500, routes: ["1", "11"] },
  { id: "24", name: "Čiekurkalns", lat: 56.9850, lon: 24.1400, routes: ["1"] },
  { id: "25", name: "Sarkandaugava", lat: 56.9950, lon: 24.1200, routes: ["5", "11"] },
  { id: "26", name: "Vecmīlgrāvis", lat: 57.0100, lon: 24.1000, routes: ["5"] },
  { id: "27", name: "Mangaļsala", lat: 57.0200, lon: 24.0800, routes: [] },
  { id: "28", name: "Mežaparks", lat: 56.9800, lon: 24.1400, routes: ["11"] },
  { id: "29", name: "Ķengarags", lat: 56.9200, lon: 24.1800, routes: ["15"] },
  { id: "30", name: "Daugavgrīva", lat: 57.0300, lon: 24.0500, routes: ["3"] },
  { id: "31", name: "Bolderāja", lat: 57.0400, lon: 24.0300, routes: ["3"] },
  { id: "32", name: "Iļģuciems", lat: 56.9600, lon: 24.0600, routes: ["4"] },
  { id: "33", name: "Dzirciems", lat: 56.9550, lon: 24.0700, routes: ["4"] },
  { id: "34", name: "Šampēteris", lat: 56.9500, lon: 24.0500, routes: ["4"] },
  { id: "35", name: "Ziepniekkalns 2", lat: 56.9150, lon: 24.0650, routes: ["3"] },
  { id: "36", name: "Biķernieki", lat: 56.9650, lon: 24.2000, routes: ["15"] },
  { id: "37", name: "Rumbula", lat: 56.9000, lon: 24.2200, routes: ["15"] },
  { id: "38", name: "Dārziņi", lat: 56.8900, lon: 24.2300, routes: [] },
  { id: "39", name: "Šķirotava", lat: 56.9100, lon: 24.1600, routes: ["15"] },
  { id: "40", name: "Maskavas forštate", lat: 56.9300, lon: 24.1400, routes: ["15", "18"] },
  { id: "41", name: "Latgales iela", lat: 56.9350, lon: 24.1300, routes: ["15"] },
  { id: "42", name: "Lāčplēša iela", lat: 56.9520, lon: 24.1250, routes: ["1", "11"] },
  { id: "43", name: "Elizabetes iela", lat: 56.9540, lon: 24.1200, routes: ["1"] },
  { id: "44", name: "Krišjāņa Barona iela", lat: 56.9560, lon: 24.1250, routes: ["1", "11"] },
  { id: "45", name: "Brīvības iela", lat: 56.9580, lon: 24.1300, routes: ["1", "11"] },
  { id: "46", name: "VEF", lat: 56.9650, lon: 24.1450, routes: ["1"] },
  { id: "47", name: "Gaisa tilts", lat: 56.9600, lon: 24.1100, routes: ["5", "11"] },
  { id: "48", name: "Vanšu tilts", lat: 56.9520, lon: 24.1000, routes: ["3"] },
  { id: "49", name: "Akmens tilts", lat: 56.9460, lon: 24.1050, routes: ["3"] },
  { id: "50", name: "Zemitāni", lat: 56.9750, lon: 24.1600, routes: ["1"] },
];

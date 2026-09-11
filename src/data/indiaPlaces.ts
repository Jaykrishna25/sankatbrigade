/**
 * Offline place index for India.
 *
 * Used for three things, all of them approximate by design:
 *   1. recognising a place named in a report ("flooding in Surat");
 *   2. giving GPS coordinates a human label (nearest known city + state);
 *   3. filtering the Command Center queue by state.
 *
 * These are approximate city-centre coordinates, good to a few kilometres. They
 * are never presented as a precise position: the UI says "nearest known city"
 * and keeps the reporter's own coordinates as the actual location. There is no
 * geocoding service, no API key and no network call — the whole index ships
 * with the app so it works offline, which is the point.
 */

export interface Place {
  name: string;
  state: string;
  lat: number;
  lng: number;
  /** Other spellings people actually type. */
  aliases?: string[];
}

export const INDIA_PLACES: Place[] = [
  // ── metros and major cities ────────────────────────────────────────────
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, aliases: ['bombay'] },
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, aliases: ['new delhi'] },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, aliases: ['bangalore'] },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, aliases: ['madras'] },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, aliases: ['calcutta'] },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, aliases: ['amdavad'] },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, aliases: ['vizag'] },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, aliases: ['cochin', 'ernakulam'] },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794 },

  // ── Gujarat ────────────────────────────────────────────────────────────
  { name: 'Gandhinagar', state: 'Gujarat', lat: 23.2156, lng: 72.6369 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, aliases: ['baroda'] },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022 },
  { name: 'Bhavnagar', state: 'Gujarat', lat: 21.7645, lng: 72.1519 },
  { name: 'Jamnagar', state: 'Gujarat', lat: 22.4707, lng: 70.0577 },
  { name: 'Junagadh', state: 'Gujarat', lat: 21.5222, lng: 70.4579 },
  { name: 'Anand', state: 'Gujarat', lat: 22.5645, lng: 72.9289 },
  { name: 'Bharuch', state: 'Gujarat', lat: 21.7051, lng: 72.9959 },
  { name: 'Navsari', state: 'Gujarat', lat: 20.9467, lng: 72.952 },
  { name: 'Mehsana', state: 'Gujarat', lat: 23.588, lng: 72.3693 },
  { name: 'Bhuj', state: 'Gujarat', lat: 23.242, lng: 69.6669 },
  { name: 'Vapi', state: 'Gujarat', lat: 20.3714, lng: 72.9047 },

  // ── Maharashtra ────────────────────────────────────────────────────────
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781 },
  { name: 'Navi Mumbai', state: 'Maharashtra', lat: 19.033, lng: 73.0297 },
  { name: 'Kalyan', state: 'Maharashtra', lat: 19.2437, lng: 73.1355 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, aliases: ['sambhajinagar'] },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064 },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.705, lng: 74.2433 },
  { name: 'Amravati', state: 'Maharashtra', lat: 20.9374, lng: 77.7796 },

  // ── Karnataka, Kerala, Tamil Nadu, Andhra, Telangana ───────────────────
  { name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, aliases: ['mysore'] },
  { name: 'Mangaluru', state: 'Karnataka', lat: 12.9141, lng: 74.856, aliases: ['mangalore'] },
  { name: 'Hubballi', state: 'Karnataka', lat: 15.3647, lng: 75.124, aliases: ['hubli'] },
  { name: 'Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, aliases: ['belgaum'] },
  { name: 'Kozhikode', state: 'Kerala', lat: 11.2588, lng: 75.7804, aliases: ['calicut'] },
  { name: 'Thrissur', state: 'Kerala', lat: 10.5276, lng: 76.2144 },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, aliases: ['trivandrum'] },
  { name: 'Kollam', state: 'Kerala', lat: 8.8932, lng: 76.6141 },
  { name: 'Kannur', state: 'Kerala', lat: 11.8745, lng: 75.3704 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, aliases: ['trichy'] },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.146 },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.341, lng: 77.7172 },
  { name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325 },
  { name: 'Tirunelveli', state: 'Tamil Nadu', lat: 8.7139, lng: 77.7567 },
  { name: 'Puducherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, aliases: ['pondicherry'] },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.648 },
  { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365 },
  { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865 },
  { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192 },
  { name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373 },
  { name: 'Warangal', state: 'Telangana', lat: 17.9689, lng: 79.5941 },
  { name: 'Nizamabad', state: 'Telangana', lat: 18.6725, lng: 78.0941 },

  // ── North ──────────────────────────────────────────────────────────────
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.391 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, aliases: ['banaras', 'kashi'] },
  { name: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463, aliases: ['allahabad'] },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.367, lng: 79.4304 },
  { name: 'Moradabad', state: 'Uttar Pradesh', lat: 28.8386, lng: 78.7733 },
  { name: 'Aligarh', state: 'Uttar Pradesh', lat: 27.8974, lng: 78.088 },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3732 },
  { name: 'Jhansi', state: 'Uttar Pradesh', lat: 25.4484, lng: 78.5685 },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, aliases: ['gurgaon'] },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635 },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905 },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217 },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066 },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767 },
  { name: 'Ludhiana', state: 'Punjab', lat: 30.901, lng: 75.8573 },
  { name: 'Amritsar', state: 'Punjab', lat: 31.634, lng: 74.8723 },
  { name: 'Jalandhar', state: 'Punjab', lat: 31.326, lng: 75.5762 },
  { name: 'Patiala', state: 'Punjab', lat: 30.3398, lng: 76.3869 },
  { name: 'Bathinda', state: 'Punjab', lat: 30.211, lng: 74.9455 },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322 },
  { name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642 },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { name: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.0837, lng: 74.7973 },
  { name: 'Jammu', state: 'Jammu and Kashmir', lat: 32.7266, lng: 74.857 },
  { name: 'Leh', state: 'Ladakh', lat: 34.1526, lng: 77.5771 },

  // ── Rajasthan and central ──────────────────────────────────────────────
  { name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  { name: 'Kota', state: 'Rajasthan', lat: 25.2138, lng: 75.8648 },
  { name: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lng: 74.6399 },
  { name: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885 },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  { name: 'Bilaspur', state: 'Chhattisgarh', lat: 22.0797, lng: 82.1409 },
  { name: 'Durg', state: 'Chhattisgarh', lat: 21.1904, lng: 81.2849 },

  // ── East and North-East ────────────────────────────────────────────────
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.6102, lng: 85.2799 },
  { name: 'Jamshedpur', state: 'Jharkhand', lat: 22.8046, lng: 86.2029 },
  { name: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304 },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  { name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.883 },
  { name: 'Rourkela', state: 'Odisha', lat: 22.2604, lng: 84.8536 },
  { name: 'Puri', state: 'Odisha', lat: 19.8135, lng: 85.8312 },
  { name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953 },
  { name: 'Asansol', state: 'West Bengal', lat: 23.6739, lng: 86.9524 },
  { name: 'Durgapur', state: 'West Bengal', lat: 23.5204, lng: 87.3119 },
  { name: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636 },
  { name: 'Muzaffarpur', state: 'Bihar', lat: 26.1197, lng: 85.391 },
  { name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 84.9994 },
  { name: 'Bhagalpur', state: 'Bihar', lat: 25.2425, lng: 86.9842 },
  { name: 'Darbhanga', state: 'Bihar', lat: 26.1542, lng: 85.8918 },
  { name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.912 },
  { name: 'Silchar', state: 'Assam', lat: 24.8333, lng: 92.7789 },
  { name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933 },
  { name: 'Imphal', state: 'Manipur', lat: 24.817, lng: 93.9368 },
  { name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176 },
  { name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868 },
  { name: 'Kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086 },
  { name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
  { name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065 },

  // ── West coast and islands ─────────────────────────────────────────────
  { name: 'Panaji', state: 'Goa', lat: 15.4909, lng: 73.8278, aliases: ['panjim'] },
  { name: 'Margao', state: 'Goa', lat: 15.2832, lng: 73.9862 },
  { name: 'Port Blair', state: 'Andaman and Nicobar Islands', lat: 11.6234, lng: 92.7265 },
  { name: 'Kavaratti', state: 'Lakshadweep', lat: 10.5669, lng: 72.6420 },
  { name: 'Silvassa', state: 'Dadra and Nagar Haveli and Daman and Diu', lat: 20.2738, lng: 73.014 },
];

/** Every state or union territory present in the index, sorted. */
export const INDIA_STATES: string[] = Array.from(new Set(INDIA_PLACES.map((place) => place.state))).sort();

const LOOKUP: { term: string; place: Place }[] = INDIA_PLACES.flatMap((place) => [
  { term: place.name.toLowerCase(), place },
  ...(place.aliases ?? []).map((alias) => ({ term: alias, place })),
]).sort((a, b) => b.term.length - a.term.length); // longest first: "navi mumbai" before "mumbai"

/**
 * Find a place named in free text. Longest match wins, and matches must sit on
 * word boundaries so "Salemabad" does not become "Salem".
 */
export function findPlaceInText(text: string): Place | null {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const entry of LOOKUP) {
    if (entry.term.length < 4) continue;
    if (haystack.includes(` ${entry.term} `)) return entry.place;
  }
  return null;
}

/** Match a state name written in free text, e.g. "flooding across Kerala". */
export function findStateInText(text: string): string | null {
  const haystack = ` ${text.toLowerCase()} `;
  return INDIA_STATES.find((state) => haystack.includes(` ${state.toLowerCase()} `)) ?? null;
}

/** The nearest indexed city to a coordinate, with the distance in kilometres. */
export function nearestPlace(lat: number, lng: number): { place: Place; km: number } | null {
  let best: { place: Place; km: number } | null = null;
  for (const place of INDIA_PLACES) {
    const dLat = (place.lat - lat) * 111;
    const dLng = (place.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const km = Math.sqrt(dLat * dLat + dLng * dLng);
    if (!best || km < best.km) best = { place, km: Math.round(km) };
  }
  return best;
}

export interface ReceiptItem {
  id: string | null;
  itemId: string | null;
  name: string;
  qty: string;
  unitPrice: number;
  total: number;
  category: string;
  tags: string[];
}

export interface Receipt {
  id: string;
  merchant: string;
  merchantId: string | null;
  date: string;
  total: number;
  itemCount: number;
  status: 'OK' | 'PND' | 'ERR';
  items: ReceiptItem[];
  savings?: number;
  linkedManifestId?: string;
  nfce?: string;
}

export interface PricePoint {
  month: string;
  price: number;
}

export interface Item {
  id: string;
  name: string;
  codename: string;
  emoji: string;
  category: string;
  lastPrice: number;
  lastDate: string;
  lowestPrice: number;
  lowestDate: string;
  freqSource: string;
  unit: string;
  delta: number;
  deltaDir: 'up' | 'down' | 'flat';
  alert: 'spike' | 'drop' | 'watch' | null;
  tags: string[];
  priceHistory: PricePoint[];
}

export interface ManifestItem {
  manifestItemId: string | null;
  name: string;
  estimated_cost: string;
  checked: boolean;
  category: string | null;
}

export interface CrewMember {
  initials: string;
  callsign: string;
  role: string;
  color: string;
  badge: string;
  id?: string;
}

export interface Manifest {
  id: string;
  title: string;
  status: 'active' | 'draft' | 'done' | 'archived';
  merchantName: string | null;
  items: ManifestItem[];
  crew: CrewMember[];
  lastModified: string;
  createdBy?: string | null;
  createdByCallsign?: string;
}

export interface KPI {
  label: string;
  value: string;
  delta: string;
  deltaType: 'pos' | 'neg' | 'warn';
}

export interface CategorySpend {
  name: string;
  emoji: string;
  amount: number;
  pct: number;
  color: string;
}

export interface MerchantRank {
  name: string;
  visits: number;
  amount: number;
  color?: string;
}

export interface Insight {
  title: string;
  body: string;
  badge: string;
  badgeType: 'green' | 'amber' | 'red';
  icon: string;
  borderColor: string;
  iconBg: string;
}

export interface Analytics {
  period: string;
  kpis: KPI[];
  categorySpend: CategorySpend[];
  merchants: MerchantRank[];
  insights: Insight[];
  totalSpend: number;
  budget: number;
}

export interface UserProfile {
  name: string;
  rank: string;
  email: string;
  level: number;
  xp: number;
  xpNext: number;
  missions: number;
  itemsTracked: number;
  variance: string;
}

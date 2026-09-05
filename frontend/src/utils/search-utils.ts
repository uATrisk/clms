export type SearchFilterType = 'all' | 'bag' | 'code' | 'name' | 'collegeId' | 'mobile';

export const SEARCH_FILTER_OPTIONS: { value: SearchFilterType; label: string }[] = [
  { value: 'all', label: 'All Fields' },
  { value: 'bag', label: 'Bag Number' },
  { value: 'code', label: 'Order Code' },
  { value: 'name', label: 'Student Name' },
  { value: 'collegeId', label: 'College ID' },
  { value: 'mobile', label: 'Mobile Number' },
];

export const SEARCH_FILTER_LABELS: Record<SearchFilterType, string> = {
  all: 'All Fields',
  bag: 'Bag Number',
  code: 'Order Code',
  name: 'Student Name',
  collegeId: 'College ID',
  mobile: 'Mobile Number',
};

export function getSearchPlaceholder(filter: SearchFilterType): string {
  switch (filter) {
    case 'bag':
      return 'Search bag (e.g. 320, B-320)...';
    case 'code':
      return 'Search order code (e.g. LN-)...';
    case 'name':
      return 'Search student name...';
    case 'collegeId':
      return 'Search college ID...';
    case 'mobile':
      return 'Search mobile number...';
    case 'all':
    default:
      return 'Search order, bag, student...';
  }
}

/**
 * Normalizes and matches a bag number against a search query.
 * Supports:
 * - Searching "320" finds "B-320" or "G-320"
 * - Searching "B-320" finds "B-320"
 * - Searching "b320" finds "B-320"
 * - Partial search e.g. "32" finds "B-320"
 */
export function matchBagNumber(bagNumber?: string | null, query?: string): boolean {
  if (!bagNumber || !query) return false;
  const cleanBag = bagNumber.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanBag || !cleanQuery) return false;

  // 1. Direct substring match
  if (cleanBag.includes(cleanQuery)) return true;

  // 2. Alphanumeric match (ignoring hyphens, spaces, etc.)
  const alphaBag = cleanBag.replace(/[^a-z0-9]/g, '');
  const alphaQuery = cleanQuery.replace(/[^a-z0-9]/g, '');
  if (alphaBag && alphaQuery && alphaBag.includes(alphaQuery)) return true;

  // 3. Strip leading gender prefix (B-, G-, B, G)
  const strippedBag = cleanBag.replace(/^[a-z][-\s]?/i, '').trim();
  const strippedQuery = cleanQuery.replace(/^[a-z][-\s]?/i, '').trim();

  if (strippedBag && strippedQuery && strippedBag.includes(strippedQuery)) return true;
  if (strippedBag && cleanQuery && strippedBag.includes(cleanQuery)) return true;
  if (cleanBag && strippedQuery && cleanBag.includes(strippedQuery)) return true;

  return false;
}

export interface SearchableOrder {
  orderCode?: string;
  bagNumber?: string;
  student?: {
    name?: string;
    email?: string;
    mobileNumber?: string;
    collegeId?: string;
  };
}

export function matchOrder<T extends SearchableOrder>(
  order: T,
  query: string,
  filterType: SearchFilterType = 'all'
): boolean {
  if (!query.trim()) return true;
  const lowerQuery = query.toLowerCase().trim();

  const code = order.orderCode?.toLowerCase() || '';
  const name = order.student?.name?.toLowerCase() || '';
  const collegeId = order.student?.collegeId?.toLowerCase() || '';
  const email = order.student?.email?.toLowerCase() || '';
  const mobile = order.student?.mobileNumber?.toLowerCase() || '';

  const bagMatches = matchBagNumber(order.bagNumber, query);
  const codeMatches = code.includes(lowerQuery);
  const nameMatches = name.includes(lowerQuery);
  const collegeIdMatches = collegeId.includes(lowerQuery);
  const emailMatches = email.includes(lowerQuery);
  const mobileMatches = mobile.includes(lowerQuery);

  switch (filterType) {
    case 'bag':
      return bagMatches;
    case 'code':
      return codeMatches;
    case 'name':
      return nameMatches;
    case 'collegeId':
      return collegeIdMatches;
    case 'mobile':
      return mobileMatches;
    case 'all':
    default:
      return (
        bagMatches ||
        codeMatches ||
        nameMatches ||
        collegeIdMatches ||
        emailMatches ||
        mobileMatches
      );
  }
}

export function filterOrders<T extends SearchableOrder>(
  orders: T[],
  query: string,
  filterType: SearchFilterType = 'all'
): T[] {
  if (!query.trim()) return orders;
  return orders.filter((order) => matchOrder(order, query, filterType));
}

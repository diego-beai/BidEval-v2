import { useRfqStore } from '../../stores/useRfqStore';
import { ResultsTable } from './ResultsTable';

export function LazyResultsTable() {
  const { results } = useRfqStore();

  // Don't render anything if no results
  if (!results || results.length === 0) {
    return null;
  }

  return <ResultsTable />;
}

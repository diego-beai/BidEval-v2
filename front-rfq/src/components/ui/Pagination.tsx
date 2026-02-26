import { useLanguageStore } from '../../stores/useLanguageStore';
import './Pagination.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, pageSize, totalCount, onPageChange }: PaginationProps) => {
  const { language } = useLanguageStore();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {language === 'es' ? 'Anterior' : 'Previous'}
      </button>

      <span className="pagination-info">
        {language === 'es'
          ? `Página ${page} de ${totalPages}`
          : `Page ${page} of ${totalPages}`}
        <span className="pagination-count">
          ({totalCount} {language === 'es' ? 'total' : 'total'})
        </span>
      </span>

      <button
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {language === 'es' ? 'Siguiente' : 'Next'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
};

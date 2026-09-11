interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
        Previous
      </button>
      <span>Page {page + 1} of {totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}>
        Next
      </button>
    </div>
  );
}
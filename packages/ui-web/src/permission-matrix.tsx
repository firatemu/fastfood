import './styles.css';

export interface PermissionMatrixColumn {
  id: string;
  label: string;
}

export interface PermissionMatrixRow {
  id: string;
  label: string;
  /** permission id → granted */
  grants: Record<string, boolean>;
}

export interface PermissionMatrixProps {
  columns: PermissionMatrixColumn[];
  rows: PermissionMatrixRow[];
  ariaLabel: string;
}

/**
 * PermissionMatrix — RBAC grid (read-only presentation; editing stays in product layer).
 */
export function PermissionMatrix(props: PermissionMatrixProps) {
  const { columns, rows, ariaLabel } = props;
  return (
    <div className="ff-permission-matrix">
      <table className="ff-permission-matrix__table" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th scope="col" className="ff-permission-matrix__corner">
              İzin
            </th>
            {columns.map((col) => (
              <th key={col.id} scope="col" className="ff-permission-matrix__role">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="ff-permission-matrix__perm">
                {row.label}
              </th>
              {columns.map((col) => {
                const granted = row.grants[col.id] ?? false;
                return (
                  <td key={col.id} className="ff-permission-matrix__cell">
                    <span
                      className={
                        granted
                          ? 'ff-permission-matrix__mark ff-permission-matrix__mark--yes'
                          : 'ff-permission-matrix__mark ff-permission-matrix__mark--no'
                      }
                      aria-label={`${row.label} — ${col.label}: ${granted ? 'var' : 'yok'}`}
                    >
                      {granted ? '✓' : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

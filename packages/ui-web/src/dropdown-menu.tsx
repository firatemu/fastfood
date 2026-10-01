import './styles.css';

export interface DropdownMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  open: boolean;
  items: DropdownMenuItem[];
  onClose?: () => void;
}

/**
 * DropdownMenu — accessible menu. role=menu.
 */
export function DropdownMenu(props: DropdownMenuProps) {
  const { open, items, onClose } = props;
  if (!open) return null;
  return (
    <ul role="menu" className="ff-dropdown-menu">
      {items.map((it) => (
        <li key={it.id} role="none">
          <button
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              it.onSelect?.();
              onClose?.();
            }}
            className="ff-dropdown-menu__item"
          >
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

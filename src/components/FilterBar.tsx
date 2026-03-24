"use client";
import styles from "./FilterBar.module.css";
interface FilterOption { label: string; value: string; }
interface FilterConfig { name: string; placeholder: string; options: FilterOption[]; }
interface Props { filters: FilterConfig[]; values: Record<string, string>; onFilter: (name: string, value: string) => void; searchValue?: string; onSearch?: (value: string) => void; }
export default function FilterBar({ filters, values, onFilter, searchValue, onSearch }: Props) {
  return (
    <div className={styles.bar}>
      {onSearch && (<input className={styles.search} type="text" placeholder="Search problems..." value={searchValue || ""} onChange={(e) => onSearch(e.target.value)} />)}
      {filters.map((f) => (
        <select key={f.name} value={values[f.name] || ""} onChange={(e) => onFilter(f.name, e.target.value)} className={styles.select}>
          <option value="">{f.placeholder}</option>
          {f.options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      ))}
    </div>
  );
}

import { redirect } from 'next/navigation';

/** Legacy /catalog → products hub */
export default function CatalogIndexRedirect() {
  redirect('/catalog/products');
}

export interface TaxonomyCategoryItem {
  id: string;
  name: string;
  fullName: string;
  isDefault?: boolean;
}

/**
 * Curated Shopify Standard Product Taxonomy categories tailored for MOJO Store
 */
export const MOJO_TAXONOMY_CATEGORIES: TaxonomyCategoryItem[] = [
  {
    id: 'gid://shopify/TaxonomyCategory/aa-1',
    name: 'Çantalar (El ve Omuz Çantaları)',
    fullName: 'Giyim ve Aksesuar > Çantalar > El Çantaları',
    isDefault: true,
  },
  {
    id: 'gid://shopify/TaxonomyCategory/aa-1-1',
    name: 'Çapraz & Omuz Çantaları (Crossbody)',
    fullName: 'Giyim ve Aksesuar > Çantalar > Çapraz Çantalar',
  },
  {
    id: 'gid://shopify/TaxonomyCategory/aa-2',
    name: 'Sırt Çantaları',
    fullName: 'Giyim ve Aksesuar > Çantalar > Sırt Çantaları',
  },
  {
    id: 'gid://shopify/TaxonomyCategory/aa-1-3',
    name: 'Cüzdan & Kartlıklar',
    fullName: 'Giyim ve Aksesuar > Cüzdanlar ve Kılıflar > Cüzdanlar',
  },
  {
    id: 'gid://shopify/TaxonomyCategory/aa-1-4',
    name: 'Çanta Askıları & Zincirler',
    fullName: 'Giyim ve Aksesuar > Çanta Aksesuarları > Çanta Askıları',
  },
];

export function getDefaultMojoCategory(): TaxonomyCategoryItem {
  return MOJO_TAXONOMY_CATEGORIES.find((c) => c.isDefault) || MOJO_TAXONOMY_CATEGORIES[0];
}

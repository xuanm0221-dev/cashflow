'use client';

interface BrandTabsProps {
  brands: { id: string | null; label: string }[];
  activeBrand: string | null;
  onChange: (brand: string | null) => void;
}

export default function BrandTabs({ brands, activeBrand, onChange }: BrandTabsProps) {
  return (
    <div className="inline-flex gap-2">
      {brands.map((brand) => (
        <button
          key={brand.id || 'entity'}
          onClick={() => onChange(brand.id)}
          className={`
            px-4 py-2 text-sm font-medium rounded transition-colors
            ${activeBrand === brand.id
              ? 'bg-teal-500 text-white hover:bg-teal-600'
              : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'}
          `}
        >
          {brand.label}
        </button>
      ))}
    </div>
  );
}

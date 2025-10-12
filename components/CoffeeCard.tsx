import React from 'react';
import { Coffee } from '../types';

interface CoffeeCardProps {
  coffee: Coffee;
}

const CoffeeCard: React.FC<CoffeeCardProps> = ({ coffee }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-stone-200 mb-6">
      <img src={coffee.imageUrl} alt={coffee.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-amber-900">{coffee.name}</h3>
        </div>
        <p className="text-stone-600 mt-2 text-sm">{coffee.description}</p>
        <div className="text-right mt-4 font-semibold text-amber-800">
          Rp {coffee.price.toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
};

export default CoffeeCard;
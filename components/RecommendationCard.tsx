import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CoffeeShop } from '../types';
import { LightBulbIcon, MapPinIcon } from './Icons';

interface RecommendationCardProps {
  shop: CoffeeShop;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ shop }) => {
  const navigate = useNavigate();

  const handleAnalysisClick = () => {
    navigate('/analysis', { state: { shop } });
  };

  const handleViewOnMap = () => {
    const searchQuery = encodeURIComponent(shop.name);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-stone-200">
      <img src={shop.imageUrl} alt={shop.name} className="w-full h-32 object-cover" />
      <div className="p-4">
        <h3 className="text-md font-bold text-stone-800 truncate">{shop.name}</h3>
        <div className="flex items-center mt-1">
          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm text-stone-600 font-medium">{shop.rating}</span>
        </div>
        <div className="mt-4 space-y-2">
            <button 
                onClick={handleAnalysisClick}
                className="w-full flex items-center justify-center px-3 py-2 bg-amber-100 text-amber-800 text-sm font-semibold rounded-lg hover:bg-amber-200 transition-colors"
                aria-label={`Lihat analisis AI untuk ${shop.name}`}
                >
                <LightBulbIcon className="w-4 h-4 mr-2" />
                Analisis AI
            </button>
            <button 
                onClick={handleViewOnMap}
                className="w-full flex items-center justify-center px-3 py-2 bg-white text-stone-700 text-sm font-semibold rounded-lg border border-stone-300 hover:bg-stone-100 transition-colors">
                <MapPinIcon className="w-4 h-4 mr-2" />
                Lihat Peta
            </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
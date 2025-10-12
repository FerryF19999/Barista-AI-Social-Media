import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CoffeeShop, CoffeeShopAnalysis } from '../types';
import { getAIAnalysisForShop } from '../services/geminiService';
import { 
    LightBulbIcon, ClockIcon, BuildingOfficeIcon, ChartBarIcon,
    WifiIcon, OutletIcon, UsersIcon, LocalParkingIcon, SmokingIcon, AcIcon, MusicalNoteIcon 
} from '../components/Icons';

const facilityIcons: { [key: string]: React.FC<{className?: string}> } = {
    'Wi-Fi Gratis': WifiIcon,
    'Stop Kontak': OutletIcon,
    'Toilet': UsersIcon,
    'Area Parkir': LocalParkingIcon,
    'Area Merokok': SmokingIcon,
    'AC': AcIcon,
    'Musik': MusicalNoteIcon,
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <section className="mb-8">
        <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 mr-3">
                {icon}
            </div>
            <h2 className="text-lg font-bold text-stone-800">{title}</h2>
        </div>
        <div>{children}</div>
    </section>
);

const BoldPoint: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split('**');
    if (parts.length === 3) {
        return (
            <li className="text-sm text-stone-600 leading-relaxed">
                <strong className="text-stone-800">{parts[1]}</strong>
                {parts[2]}
            </li>
        );
    }
    return <li className="text-sm text-stone-600 leading-relaxed">{text}</li>;
};

const AiAnalysisPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { shop } = (location.state as { shop: CoffeeShop }) || {};
    
    const [analysis, setAnalysis] = useState<CoffeeShopAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shop) {
            setError("Informasi kedai kopi tidak ditemukan.");
            setLoading(false);
            return;
        }

        const fetchAnalysis = async () => {
            try {
                const data = await getAIAnalysisForShop(shop);
                setAnalysis(data);
            } catch (err) {
                setError("Gagal memuat analisis AI. Silakan coba lagi.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [shop]);

    const handleViewOnMap = () => {
        if (!analysis) return;
        const searchQuery = encodeURIComponent(analysis.name);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#FAF8F1' }}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-amber-700 mx-auto"></div>
                    <p className="mt-4 text-stone-600">Menganalisis kecocokan...</p>
                </div>
            </div>
        );
    }
    
    if (error || !analysis) {
        return (
             <div className="flex flex-col items-center justify-center h-screen p-4 text-center" style={{ backgroundColor: '#FAF8F1' }}>
                <p className="text-red-600 font-semibold">{error || "Data tidak tersedia."}</p>
                <button
                    onClick={() => navigate('/ask-ai')}
                    className="mt-6 bg-amber-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-800 transition-colors"
                >
                    Kembali ke Ask AI
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FAF8F1' }}>
            <main className="p-6">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-stone-900">{analysis.name}</h1>
                    <p className="text-amber-700 font-medium mt-1">{analysis.subtitle}</p>
                </header>

                <Section icon={<LightBulbIcon className="w-5 h-5" />} title={`Mengapa ${analysis.name} Cocok Untuk Anda?`}>
                    <p className="text-sm text-stone-600 leading-relaxed mb-4">{analysis.why.paragraph}</p>
                    <ul className="space-y-2 list-disc list-inside">
                        {analysis.why.points.map((point, index) => <BoldPoint key={index} text={point} />)}
                    </ul>
                </Section>

                <Section icon={<ClockIcon />} title="Jam Operasional">
                    <div className="bg-white rounded-lg p-3 border border-stone-200 shadow-sm">
                        <ul className="space-y-2">
                            {analysis.hours.map((item, index) => (
                                <li key={index} className={`flex justify-between items-center text-sm p-3 rounded-md ${item.status ? 'bg-amber-100 border border-amber-300 font-bold' : ''}`}>
                                    <span className={item.status ? 'text-amber-900' : 'text-stone-700'}>{item.day}</span>
                                    <div className="flex items-center">
                                        {item.status === 'Buka' && <span className="text-xs bg-green-500 text-white font-semibold px-2 py-0.5 rounded-full mr-3">Buka</span>}
                                        {item.status === 'Tutup' && <span className="text-xs bg-red-500 text-white font-semibold px-2 py-0.5 rounded-full mr-3">Tutup</span>}
                                        <span className={item.status ? 'text-amber-900' : 'text-stone-500'}>{item.time}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Section>

                <Section icon={<BuildingOfficeIcon />} title="Fasilitas yang Tersedia">
                    <div className="grid grid-cols-3 gap-3">
                        {analysis.facilities.map(facility => {
                            const Icon = facilityIcons[facility];
                            return (
                                <div key={facility} className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-stone-200 shadow-sm text-center">
                                    {Icon && <Icon className="w-7 h-7 text-amber-800 mb-2" />}
                                    <span className="text-xs font-medium text-stone-600">{facility}</span>
                                </div>
                            );
                        })}
                    </div>
                </Section>
                
                <Section icon={<ChartBarIcon />} title="Skor Kecocokan">
                    <div className="space-y-4">
                        {analysis.scores.map(score => (
                            <div key={score.label}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-stone-700">{score.label}</span>
                                    <span className="text-sm font-bold text-amber-800">{score.value}%</span>
                                </div>
                                <div className="w-full bg-stone-200 rounded-full h-2.5">
                                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${score.value}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                <footer className="mt-12 space-y-3">
                    <button
                        onClick={() => navigate('/ask-ai')}
                        className="w-full bg-amber-500 text-stone-900 font-bold py-4 rounded-xl hover:bg-amber-600 transition-colors shadow-lg"
                    >
                        Kembali ke Ask AI
                    </button>
                    <button
                        onClick={handleViewOnMap}
                        className="w-full bg-white text-stone-800 font-bold py-4 rounded-xl border border-stone-300 hover:bg-stone-100 transition-colors shadow-lg"
                    >
                        Lihat di Peta
                    </button>
                </footer>
            </main>
        </div>
    );
};

export default AiAnalysisPage;
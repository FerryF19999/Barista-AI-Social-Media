import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { PostContext } from '../context/PostContext';
import { CameraIcon, ArrowUpTrayIcon } from '../components/Icons';

const AddPostPage: React.FC = () => {
    const navigate = useNavigate();
    const postContext = useContext(PostContext);

    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [locationTag, setLocationTag] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = (useCamera: boolean) => {
        if (fileInputRef.current) {
            if (useCamera) {
                fileInputRef.current.setAttribute('capture', 'environment');
            } else {
                fileInputRef.current.removeAttribute('capture');
            }
            fileInputRef.current.click();
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContext || !caption || !locationTag || !selectedImageUrl) {
            return;
        }

        postContext.addPost({
            imageUrl: selectedImageUrl,
            caption,
            locationTag
        });
        
        navigate('/feed');
    };

    const isFormValid = caption.trim() !== '' && locationTag.trim() !== '' && selectedImageUrl;

    return (
        <div className="bg-stone-50 min-h-screen">
            <Header title="Create New Post" />
            <main className="p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />

                        {selectedImageUrl ? (
                            <div className="relative group">
                                <img
                                    src={selectedImageUrl}
                                    alt="Pratinjau postingan"
                                    className="w-full aspect-square object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSelectedImageUrl(null)}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white font-bold py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Ubah Gambar
                                </button>
                            </div>
                        ) : (
                            <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-100 p-4">
                               <div className="text-center space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => triggerFileInput(true)}
                                        className="flex items-center justify-center w-full px-4 py-3 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                                    >
                                        <CameraIcon className="w-5 h-5 mr-2" />
                                        Ambil Foto
                                    </button>
                                     <button
                                        type="button"
                                        onClick={() => triggerFileInput(false)}
                                        className="flex items-center justify-center w-full px-4 py-3 bg-white text-stone-700 text-sm font-semibold rounded-lg border border-stone-300 hover:bg-stone-100 transition-colors"
                                    >
                                        <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                                        Unggah dari Galeri
                                    </button>
                               </div>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="caption" className="block text-sm font-medium text-stone-700">
                            Caption
                        </label>
                        <textarea
                            id="caption"
                            rows={4}
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            className="w-full p-3 mt-1 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Tulis sesuatu tentang kopimu..."
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-stone-700">
                            Tag Lokasi
                        </label>
                        <input
                            id="location"
                            type="text"
                            value={locationTag}
                            onChange={e => setLocationTag(e.target.value)}
                            className="w-full p-3 mt-1 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Contoh: Sejiwa Coffee"
                        />
                    </div>
                    
                    <div className="flex space-x-2">
                         <button
                            type="button"
                            onClick={() => navigate('/feed')}
                            className="w-full bg-stone-200 text-stone-700 font-bold py-3 rounded-lg hover:bg-stone-300 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid}
                            className="w-full bg-amber-700 text-white font-bold py-3 rounded-lg hover:bg-amber-800 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
                        >
                            Posting
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddPostPage;
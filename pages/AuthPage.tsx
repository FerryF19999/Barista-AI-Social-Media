import React, { useState, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AuthPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);
    
    const mode = searchParams.get('mode') || 'login';
    const isLogin = mode === 'login';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authContext) return;

        setError(null);
        setIsSubmitting(true);

        if (!isLogin && password !== confirmPassword) {
            setError("Kata sandi tidak cocok.");
            setIsSubmitting(false);
            return;
        }

        try {
            let result;
            if (isLogin) {
                result = await authContext.login(email, password);
            } else {
                result = await authContext.signup(email, password);
            }

            if (result.success) {
                navigate('/feed');
            } else {
                setError(result.message || 'Terjadi kesalahan.');
            }
        } catch (err) {
            setError('Gagal terhubung ke server. Coba lagi nanti.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-stone-50">
            <div className="w-full max-w-sm mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-amber-900">{isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}</h1>
                    <p className="text-stone-600 mt-2">{isLogin ? 'Masuk untuk melanjutkan petualangan kopimu.' : 'Satu langkah lagi untuk menemukan kopi terbaik.'}</p>
                </div>
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                            Alamat Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 mt-1 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="kamu@contoh.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                            Kata Sandi
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 mt-1 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="••••••••"
                        />
                    </div>
                    {!isLogin && (
                         <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-700">
                                Konfirmasi Kata Sandi
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full p-3 mt-1 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm text-center -mt-2">{error}</p>}
                    
                    <button
                        type="submit"
                        className="w-full bg-amber-700 text-white font-bold py-3 rounded-lg hover:bg-amber-800 transition-colors disabled:bg-stone-300 disabled:opacity-75"
                        disabled={!email || !password || isSubmitting}
                    >
                        {isSubmitting ? (isLogin ? 'Masuk...' : 'Mendaftar...') : (isLogin ? 'Masuk' : 'Daftar')}
                    </button>
                </form>
                 <p className="text-center text-sm text-stone-500 mt-6">
                    {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
                    <Link to={isLogin ? "/auth?mode=signup" : "/auth?mode=login"} className="font-bold text-amber-800 hover:underline">
                        {isLogin ? "Daftar di sini" : "Masuk di sini"}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
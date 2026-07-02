import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
    Lock as LockIcon,
    ArrowRight,
    ShieldCheck,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('This reset link is invalid or has expired. Please request a new one.');
            return;
        }
        if (!password) {
            setError('Please enter a new access key.');
            return;
        }
        if (password.length < 6) {
            setError('Access key must be at least 6 characters.');
            return;
        }
        if (!confirmPassword) {
            setError('Please confirm your access key.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Security keys do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';
            await axios.post(`${apiBase}/api/reset-password`, { token, password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Connection failure: Database offline.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center w-full relative overflow-hidden py-16 px-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,64,175,0.15),transparent_70%)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-blue-900/30">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
                                New Access Key
                            </span>
                        </h2>
                        <div className="flex items-center justify-center gap-2 opacity-40">
                            <ShieldCheck size={14} className="text-blue-400" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Secure Verification</p>
                        </div>
                    </div>

                    {!token ? (
                        <div className="space-y-6 text-center">
                            <div className="flex flex-col items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <AlertCircle size={28} className="text-red-400" />
                                <p className="text-sm text-red-100/80 leading-relaxed">
                                    This reset link is invalid or has expired. Please request a new one.
                                </p>
                            </div>
                            <Link
                                to="/forgot-password"
                                className="w-full inline-flex py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] items-center justify-center gap-2"
                            >
                                Request New Link <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : success ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-4 text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"
                        >
                            <CheckCircle2 size={28} className="text-emerald-400" />
                            <p className="text-sm text-emerald-100/80 leading-relaxed">
                                Password updated. Redirecting you to login...
                            </p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest ml-1 block">New Access Key</label>
                                <div className="relative group">
                                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-white/10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest ml-1 block">Confirm Key</label>
                                <div className="relative group">
                                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-white/10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 text-red-400 text-[10px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20 uppercase tracking-widest">
                                    <AlertCircle size={16} /> {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                    {!isLoading && <ArrowRight size={16} />}
                                </span>
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
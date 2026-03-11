import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Image, Upload, X, Edit2, Link as LinkIcon, Star, CheckCircle, XCircle, Folders } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';

const ManageSponsors = () => {
    const { isAdmin } = useAuth();
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const fileInputRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        websiteUrl: '',
        logoUrl: '',
        tier: 'Gold', // Premium, Gold, Silver, Bronze
        target: 'General', // General, Tournament, Team
        active: true
    });

    useEffect(() => {
        fetchSponsors();
    }, []);

    const fetchSponsors = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'sponsors'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const sponsorsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSponsors(sponsorsData);
        } catch (error) {
            console.error("Error fetching sponsors:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setStatusText('Starting Upload...');

        try {
            const storageRef = ref(storage, `sponsors/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progressValue = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setProgress(progressValue);
                        setStatusText(`Uploading ${Math.round(progressValue)}%...`);
                    },
                    (error) => {
                        console.error("Upload error:", error);
                        reject(error);
                    },
                    () => {
                        resolve();
                    }
                );
            });

            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setFormData(prev => ({ ...prev, logoUrl: downloadURL }));

            // Automatically register in Media Repository
            await registerAsset(file.name, downloadURL, 'Sponsors');

            setStatusText('Done!');
        } catch (error) {
            console.error("Error uploading image:", error);
            alert(`Failed to upload image. Error: ${error.code || error.message}`);
            setStatusText('Error');
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
            setTimeout(() => setStatusText(''), 2000);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const resetForm = () => {
        setFormData({ name: '', websiteUrl: '', logoUrl: '', tier: 'Gold', target: 'General', active: true });
        setEditingId(null);
    };

    const handleEdit = (item) => {
        setFormData({
            name: item.name || '',
            websiteUrl: item.websiteUrl || '',
            logoUrl: item.logoUrl || '',
            tier: item.tier || 'Gold',
            target: item.target || 'General',
            active: item.active !== false // default to true if undefined
        });
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const sponsorRef = doc(db, 'sponsors', editingId);
                await updateDoc(sponsorRef, {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'sponsors'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
            }
            resetForm();
            fetchSponsors();
        } catch (error) {
            console.error("Error saving sponsor:", error);
            alert(`Error saving sponsor: ${error.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this sponsor?')) {
            try {
                await deleteDoc(doc(db, 'sponsors', id));
                fetchSponsors();
                if (editingId === id) resetForm();
            } catch (error) {
                console.error("Error deleting sponsor:", error);
            }
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            const sponsorRef = doc(db, 'sponsors', id);
            await updateDoc(sponsorRef, {
                active: !currentStatus
            });
            fetchSponsors();
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    }

    if (!isAdmin) return <div className="text-slate-900 dark:text-white text-center py-20">Access Denied</div>;

    const getTierBadgeColor = (tier) => {
        switch (tier) {
            case 'Premium': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'Gold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'Silver': return 'bg-gray-400/20 text-slate-600 dark:text-gray-300 border-gray-400/30';
            case 'Bronze': return 'bg-orange-700/20 text-orange-500 border-orange-700/30';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-6">Manage Sponsors</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 rounded-2xl sticky top-24">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {editingId ? <Edit2 size={20} className="text-brand-400" /> : <Plus size={20} className="text-brand-400" />}
                                {editingId ? 'Edit Sponsor' : 'Add Sponsor'}
                            </div>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white underline"
                                >
                                    Cancel
                                </button>
                            )}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Company/Sponsor Name*</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Website URL (Optional)</label>
                                <input
                                    type="url"
                                    className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.websiteUrl}
                                    onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Tier</label>
                                    <select
                                        className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                        value={formData.tier}
                                        onChange={e => setFormData({ ...formData, tier: e.target.value })}
                                    >
                                        <option value="Premium">Premium</option>
                                        <option value="Gold">Gold</option>
                                        <option value="Silver">Silver</option>
                                        <option value="Bronze">Bronze</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Target</label>
                                    <select
                                        className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                        value={formData.target}
                                        onChange={e => setFormData({ ...formData, target: e.target.value })}
                                    >
                                        <option value="General">General</option>
                                        <option value="Tournament">Tournament</option>
                                        <option value="Team">Team</option>
                                    </select>
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Logo Image*</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Or paste image URL..."
                                        className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                                        value={formData.logoUrl}
                                        onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                        required
                                    />

                                    <div className="flex gap-2 w-full">
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            disabled={uploading}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-200/10 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors w-full"
                                        >
                                            <Upload size={16} />
                                            <span>Upload Logo</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAssetPicker(true)}
                                            disabled={uploading}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 border border-brand-500/20 rounded-lg text-sm transition-colors"
                                        >
                                            <Folders size={16} />
                                            <span>Repo</span>
                                        </button>
                                    </div>

                                    {/* Preview */}
                                    {formData.logoUrl && (
                                        <div className="relative mt-2 p-4 rounded-lg bg-white/10 border border-slate-200/10 dark:border-white/10 flex items-center justify-center group h-32">
                                            <img src={formData.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-lg" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, logoUrl: '' })}
                                                className="absolute top-2 right-2 p-1 bg-black/50 text-slate-900 dark:text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={14} />
                                            </button>
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                                    <div className="text-slate-900 dark:text-white text-xs font-medium animate-pulse">Processing...</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200/10 dark:border-white/10">
                                <input
                                    type="checkbox"
                                    id="activeStatus"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 text-brand-600 bg-black/20 border-slate-200/10 dark:border-white/10 rounded rounded-lg focus:ring-brand-500 focus:ring-2"
                                />
                                <label htmlFor="activeStatus" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Active (Visible on Site)
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-slate-900 dark:text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {uploading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-slate-200/30 dark:border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{statusText || 'Processing...'}</span>
                                    </>
                                ) : (
                                    <span>{editingId ? 'Update Sponsor' : 'Add Sponsor'}</span>
                                )}
                            </button>
                        </form>

                        <AssetPicker
                            isOpen={showAssetPicker}
                            onClose={() => setShowAssetPicker(false)}
                            onSelect={(url) => setFormData(prev => ({ ...prev, logoUrl: url }))}
                            category="Sponsors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Current Sponsors</h2>
                    {loading ? (
                        <div className="text-center py-10 text-slate-600 dark:text-slate-400">Loading...</div>
                    ) : (
                        <div className="space-y-4">
                            {sponsors.map(item => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`glass-card p-4 rounded-xl flex gap-4 group items-center ${!item.active ? 'opacity-60' : ''}`}
                                >
                                    <div className="w-24 h-16 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                                        {item.logoUrl ? (
                                            <img src={item.logoUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Image size={24} className="text-slate-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getTierBadgeColor(item.tier)}`}>
                                                        {item.tier}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                                        <Star size={10} /> {item.target}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate flex items-center gap-2">
                                                    {item.name}
                                                    {!item.active && <span className="text-xs text-red-400 font-normal">(Inactive)</span>}
                                                </h3>
                                            </div>
                                            <div className="flex gap-1 ml-4 flex-shrink-0">
                                                <button
                                                    onClick={() => toggleActive(item.id, item.active)}
                                                    className={`p-2 transition-colors ${item.active ? 'text-green-500 hover:text-green-400' : 'text-slate-500 hover:text-green-500'}`}
                                                    title={item.active ? "Deactivate" : "Activate"}
                                                >
                                                    {item.active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="text-slate-500 hover:text-brand-400 p-2 transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-slate-500 hover:text-red-500 p-2 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        {item.websiteUrl && (
                                            <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-400 text-xs mt-1 flex items-center gap-1 truncate max-w-xs">
                                                <LinkIcon size={12} /> {item.websiteUrl}
                                            </a>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {sponsors.length === 0 && (
                                <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-slate-200/10 dark:border-white/10 text-slate-500">
                                    No sponsors added yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageSponsors;

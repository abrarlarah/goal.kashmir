import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Image, Upload, Camera, X, Edit2, Folders } from 'lucide-react';
import { cn } from '../../utils/cn';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';
import { logAuditEvent } from '../../utils/auditLogger';

const ManageGallery = () => {
    const { currentUser, isSuperAdmin, hasAnyAdminAccess } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const fileInputRef = useRef(null);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        imageUrl: '',
        category: 'Match Action', // Matches the front-end categories
        date: '' // Optional custom date string
    });
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const galleryData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPhotos(galleryData);
        } catch (error) {
            console.error("Error fetching gallery:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Image Processing Utility ---
    const compressImage = async (file) => {
        return new Promise((resolve) => {
            const img = document.createElement('img');
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; // slightly larger for gallery
                let newWidth = img.width;
                let newHeight = img.height;

                if (img.width > MAX_WIDTH) {
                    const scaleSize = MAX_WIDTH / img.width;
                    newWidth = MAX_WIDTH;
                    newHeight = img.height * scaleSize;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            };
        });
    };

    const handleImageUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setStatusText('Processing...');

        try {
            if (file.type.match(/image.*/)) {
                setStatusText('Compressing...');
                try {
                    const compressed = await compressImage(file);
                    if (compressed.size < file.size) {
                        file = compressed;
                    }
                } catch (compressError) {
                    // Ignore compression errors
                }
            }

            setStatusText('Starting Upload...');
            const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progressValue = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setProgress(progressValue);
                        setStatusText(`Uploading ${Math.round(progressValue)}%...`);
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
            
            // Optionally auto-set title from filename if empty
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
            }

            await registerAsset(file.name, downloadURL, 'Gallery');
            setStatusText('Done!');
        } catch (error) {
            console.error("Error uploading image:", error);
            alert(`Failed to upload image.`);
            setStatusText('Error');
        } finally {
            setUploading(false);
            e.target.value = null; 
            setTimeout(() => setStatusText(''), 2000);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const resetForm = () => {
        setFormData({ title: '', imageUrl: '', category: 'Match Action', date: '' });
        setEditingId(null);
    };

    const handleEdit = (item) => {
        setFormData({
            title: item.title || '',
            imageUrl: item.url || item.imageUrl,
            category: item.category || 'Match Action',
            date: item.date || ''
        });
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.imageUrl) {
            alert("Please provide an image.");
            return;
        }

        try {
            const dataToSave = {
                title: formData.title,
                url: formData.imageUrl,          // Used 'url' to match gallery front-end easily
                thumbnail: formData.imageUrl,    // Can add actual thumb generation later
                category: formData.category,
                date: formData.date || new Date().toLocaleDateString(),
                type: 'image',
                uploadedBy: currentUser?.uid
            };

            if (editingId) {
                await updateDoc(doc(db, 'gallery', editingId), {
                    ...dataToSave,
                    updatedAt: serverTimestamp()
                });
                logAuditEvent('UPDATE_GALLERY', {
                    entityType: 'gallery',
                    entityId: editingId,
                    entityName: formData.title,
                });
            } else {
                const docRef = await addDoc(collection(db, 'gallery'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                logAuditEvent('CREATE_GALLERY', {
                    entityType: 'gallery',
                    entityId: docRef.id,
                    entityName: formData.title,
                });
            }
            resetForm();
            fetchGallery();
        } catch (error) {
            console.error("Error saving photo:", error);
            alert(`Error saving photo: ${error.message}`);
        }
    };

    const handleDelete = async (id, title) => {
        if (window.confirm('Are you sure you want to delete this photo from the gallery?')) {
            try {
                await deleteDoc(doc(db, 'gallery', id));
                logAuditEvent('DELETE_GALLERY', {
                    entityType: 'gallery',
                    entityId: id,
                    entityName: title || 'Unknown',
                });
                fetchGallery();
                if (editingId === id) resetForm();
            } catch (error) {
                console.error("Error deleting photo:", error);
            }
        }
    };

    if (!hasAnyAdminAccess) return <div className="text-slate-900 dark:text-white text-center py-20">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-6">Manage Gallery</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 rounded-2xl sticky top-24">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {editingId ? <Edit2 size={20} className="text-brand-400" /> : <Plus size={20} className="text-brand-400" />}
                                {editingId ? 'Edit Photo' : 'Upload Photo'}
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
                            
                            {/* Image Upload Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Image</label>
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
                                        value={formData.imageUrl}
                                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                        required
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            disabled={uploading}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-200/10 dark:border-white/10 rounded-lg text-sm transition-colors"
                                        >
                                            <Upload size={16} />
                                            <span>Upload</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAssetPicker(true)}
                                            disabled={uploading}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 border border-brand-500/20 rounded-lg text-sm transition-colors"
                                        >
                                            <Folders size={16} />
                                            <span>Repo</span>
                                        </button>
                                    </div>

                                    {/* Preview */}
                                    {formData.imageUrl && (
                                        <div className="relative mt-2 rounded-lg overflow-hidden aspect-video border border-slate-200/10 dark:border-white/10 bg-black/40 group">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                                className="absolute top-2 right-2 p-1 bg-black/50 text-slate-900 dark:text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={14} />
                                            </button>
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <div className="text-slate-900 dark:text-white text-xs font-medium animate-pulse">Processing...</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Title / Caption</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                                <select
                                    className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Match Action">Match Action</option>
                                    <option value="Teams">Teams</option>
                                    <option value="Players">Players</option>
                                    <option value="Fans">Fans</option>
                                    <option value="Trophy">Trophy / Awards</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Date (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Feb 28, 2026 or Matchday 1"
                                    className="w-full bg-black/20 border border-slate-200/10 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-slate-900 dark:text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-slate-200/30 dark:border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{statusText || 'Processing...'}</span>
                                    </>
                                ) : (
                                    <span>{editingId ? 'Update Photo' : 'Publish Photo'}</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Gallery Photos</h2>
                    {loading ? (
                        <div className="text-center py-10 text-slate-600 dark:text-slate-400">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {photos.map(item => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-card rounded-xl overflow-hidden group relative"
                                >
                                    <div className="aspect-square bg-slate-50 dark:bg-slate-800">
                                        <img src={item.url || item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {(isSuperAdmin || item.uploadedBy === currentUser?.uid) && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1.5 bg-black/50 text-white hover:text-brand-400 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.title)}
                                                        className="p-1.5 bg-black/50 text-white hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block">{item.category}</span>
                                        <h3 className="font-bold text-white text-sm leading-tight truncate">{item.title}</h3>
                                    </div>
                                </motion.div>
                            ))}
                            {photos.length === 0 && (
                                <div className="col-span-full text-center py-10 bg-white/5 rounded-xl border border-dashed border-slate-200/10 dark:border-white/10 text-slate-500">
                                    No photos added to gallery yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <AssetPicker
                isOpen={showAssetPicker}
                onClose={() => setShowAssetPicker(false)}
                onSelect={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                category="Gallery"
            />
        </div>
    );
};

export default ManageGallery;

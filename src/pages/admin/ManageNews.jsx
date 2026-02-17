import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Image, Type, Upload, Camera, X, Check, Edit2, Folders } from 'lucide-react';
import { cn } from '../../utils/cn';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';

const ManageNews = () => {
    const { isAdmin } = useAuth();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        excerpt: '',
        content: '',
        imageUrl: '',
        category: 'Club News'
    });

    useEffect(() => {
        fetchNews();
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const newsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNews(newsData);
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    };

    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    // --- Image Processing Utility ---
    const compressImage = async (file) => {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
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
                        console.error("Canvas compression failed");
                        resolve(file);
                        return;
                    }
                    const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.7);
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(objectUrl);
                console.error("Image load failed", err);
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
            // Check if it's an image
            if (file.type.match(/image.*/)) {
                setStatusText('Compressing...');
                try {
                    const compressed = await compressImage(file);
                    if (compressed.size < file.size) {
                        file = compressed;
                    }
                } catch (compressError) {
                    console.warn("Compression failed, using original file:", compressError);
                }
            }

            setStatusText('Starting Upload...');
            const storageRef = ref(storage, `news/${Date.now()}_${file.name}`);

            const uploadTask = uploadBytesResumable(storageRef, file);

            // Wrap upload in a promise to properly await it
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

            // Get URL from the snapshot ref which is guaranteed to be ready
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            setFormData(prev => ({ ...prev, imageUrl: downloadURL }));

            // Automatically register in Media Repository
            await registerAsset(file.name, downloadURL, 'News');

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

    // --- Webcam Capture Logic ---
    const startCamera = async () => {
        setUploading(true); // Re-use loading state effectively
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            setCameraStream(stream);
            setShowCamera(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setUploading(false);
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access camera. Please allow permissions.");
            setUploading(false);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        stopCamera();
        setUploading(true);

        // Convert directly to JPEG with lower quality for speed
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                // Upload directly without further compression steps since canvas allows quality param
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
                console.log(`Webcam capture size: ${(file.size / 1024).toFixed(2)} KB`);

                const storageRef = ref(storage, `news/${file.name}`);
                setStatusText('Starting Upload...');

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
                setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
                setStatusText('Done!');
            } catch (error) {
                console.error("Error uploading capture:", error);
                alert(`Failed to upload photo. Error: ${error.code || error.message}`);
                setStatusText('Error');
            } finally {
                setUploading(false);
                setTimeout(() => setStatusText(''), 2000);
            }
        }, 'image/jpeg', 0.6);
    };

    const resetForm = () => {
        setFormData({ title: '', excerpt: '', content: '', imageUrl: '', category: 'Club News' });
        setEditingId(null);
    };

    const handleEdit = (item) => {
        setFormData({
            title: item.title,
            excerpt: item.excerpt,
            content: item.content,
            imageUrl: item.imageUrl,
            category: item.category
        });
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing document
                const newsRef = doc(db, 'news', editingId);
                await updateDoc(newsRef, {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
                alert('News article updated successfully!');
            } else {
                // Create new document
                await addDoc(collection(db, 'news'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
                alert('News article added successfully!');
            }
            resetForm();
            fetchNews();
        } catch (error) {
            console.error("Error saving news:", error);
            alert(`Error saving news: ${error.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this article?')) {
            try {
                await deleteDoc(doc(db, 'news', id));
                fetchNews();
                if (editingId === id) resetForm();
            } catch (error) {
                console.error("Error deleting news:", error);
            }
        }
    };

    if (!isAdmin) return <div className="text-white text-center py-20">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-display font-bold text-white mb-6">Manage News</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 rounded-2xl sticky top-24">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {editingId ? <Edit2 size={20} className="text-brand-400" /> : <Plus size={20} className="text-brand-400" />}
                                {editingId ? 'Edit Article' : 'New Article'}
                            </div>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs text-slate-400 hover:text-white underline"
                                >
                                    Cancel
                                </button>
                            )}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Club News">Club News</option>
                                    <option value="Match Report">Match Report</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="Announcement">Announcement</option>
                                </select>
                            </div>

                            {/* Image Upload Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Article Image</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                <div className="space-y-3">
                                    {/* Camera UI */}
                                    <AnimatePresence>
                                        {showCamera && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="relative overflow-hidden rounded-lg bg-black border border-brand-500/30"
                                            >
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full aspect-video object-cover"
                                                    onLoadedMetadata={(e) => e.target.play()}
                                                />
                                                <canvas ref={canvasRef} className="hidden" />
                                                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={capturePhoto}
                                                        className="h-12 w-12 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-lg"
                                                    >
                                                        <div className="h-10 w-10 rounded-full border-2 border-slate-800" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={stopCamera}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* URL Input Fallback */}
                                    <input
                                        type="url"
                                        placeholder="Or paste image URL..."
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                                        value={formData.imageUrl}
                                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                        disabled={showCamera}
                                    />

                                    {/* Action Buttons */}
                                    {!showCamera && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={triggerFileInput}
                                                disabled={uploading}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
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
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                disabled={uploading}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors col-span-2"
                                            >
                                                <Camera size={16} />
                                                <span>Take Photo</span>
                                            </button>
                                        </div>
                                    )}

                                    <AssetPicker
                                        isOpen={showAssetPicker}
                                        onClose={() => setShowAssetPicker(false)}
                                        onSelect={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                        category="News"
                                    />

                                    {/* Preview */}
                                    {formData.imageUrl && !showCamera && (
                                        <div className="relative mt-2 rounded-lg overflow-hidden aspect-video border border-white/10 bg-black/40 group">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={14} />
                                            </button>
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <div className="text-white text-xs font-medium animate-pulse">Processing...</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Summary (Excerpt)</label>
                                <textarea
                                    required
                                    rows="2"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.excerpt}
                                    onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Full Content</label>
                                <textarea
                                    required
                                    rows="6"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{statusText || 'Processing...'}</span>
                                    </>
                                ) : (
                                    <span>{editingId ? 'Update Article' : 'Publish Article'}</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4">Published Articles</h2>
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Loading...</div>
                    ) : (
                        <div className="space-y-4">
                            {news.map(item => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-4 rounded-xl flex gap-4 group"
                                >
                                    <div className="w-24 h-24 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                <Image size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1 block">{item.category}</span>
                                                <h3 className="font-bold text-white text-lg leading-tight truncate">{item.title}</h3>
                                            </div>
                                            <div className="flex gap-1">
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
                                        <p className="text-slate-400 text-sm mt-2 line-clamp-2">{item.excerpt}</p>
                                        <div className="mt-2 text-xs text-slate-600">
                                            {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {news.length === 0 && (
                                <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-500">
                                    No news articles yet. Add your first story!
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageNews;

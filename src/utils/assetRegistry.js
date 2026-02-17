import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Registers an uploaded image or logo in the 'assets' collection 
 * so it appears in the AssetPicker/Repository.
 * @param {string} name - Name of the asset
 * @param {string} url - Download URL of the image
 * @param {string} category - Category (Teams, Players, News)
 */
export const registerAsset = async (name, url, category) => {
    try {
        await addDoc(collection(db, 'assets'), {
            name,
            url,
            category,
            createdAt: serverTimestamp(),
            type: 'uploaded'
        });
        console.log(`Asset registered: ${name}`);
    } catch (error) {
        console.error("Error registering asset:", error);
    }
};

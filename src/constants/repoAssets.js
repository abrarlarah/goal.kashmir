/**
 * This file dynamically loads all images from the src/assets/images folders.
 * Any image you add to those folders will automatically appear in the AssetPicker.
 */

// Function to process a Webpack context and return an array of assets
const processContext = (context, category) => {
    return context.keys().map(key => {
        // Remove './' from start and file extension from end for the name
        const name = key
            .replace('./', '')
            .split('.')
            .slice(0, -1)
            .join('.')
            .replace(/[-_]/g, ' ');

        return {
            id: `${category.toLowerCase()}-${key.replace('./', '')}`,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            url: context(key),
            category: category
        };
    });
};

// Use require.context to find all images in the assets folders
let teams = [];
let players = [];
let news = [];

try {
    const teamsCtx = require.context('../assets/images/teams', false, /\.(png|jpe?g|svg|webp)$/);
    teams = processContext(teamsCtx, 'Teams');
} catch (e) {
    console.warn('Teams image folder not found or empty');
}

try {
    const playersCtx = require.context('../assets/images/players', false, /\.(png|jpe?g|svg|webp)$/);
    players = processContext(playersCtx, 'Players');
} catch (e) {
    console.warn('Players image folder not found or empty');
}

try {
    const newsCtx = require.context('../assets/images/news', false, /\.(png|jpe?g|svg|webp)$/);
    news = processContext(newsCtx, 'News');
} catch (e) {
    console.warn('News image folder not found or empty');
}

export const REPO_ASSETS = [...teams, ...players, ...news];

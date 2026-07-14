/**
 * This file dynamically loads all images from the src/assets/images folders.
 * Any image you add to those folders will automatically appear in the AssetPicker.
 *
 * Uses Vite's import.meta.glob() for dynamic asset loading.
 */

// Use import.meta.glob to find all images (Vite equivalent of Webpack's require.context)
const teamModules = import.meta.glob('../assets/images/teams/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const playerModules = import.meta.glob('../assets/images/players/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const newsModules = import.meta.glob('../assets/images/news/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const sponsorModules = import.meta.glob('../assets/images/sponsors/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });

// Function to process glob results and return an array of assets
const processGlob = (modules, category) => {
    return Object.entries(modules).map(([path, url]) => {
        // Extract filename from the path (e.g., '../assets/images/teams/team1.png' → 'team1.png')
        const filename = path.split('/').pop();
        // Remove file extension for the display name
        const name = filename
            .split('.')
            .slice(0, -1)
            .join('.')
            .replace(/[-_]/g, ' ');

        return {
            id: `${category.toLowerCase()}-${filename}`,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            url: url,
            category: category
        };
    });
};

const teams = processGlob(teamModules, 'Teams');
const players = processGlob(playerModules, 'Players');
const news = processGlob(newsModules, 'News');
const sponsors = processGlob(sponsorModules, 'Sponsors');

export const REPO_ASSETS = [...teams, ...players, ...news, ...sponsors];

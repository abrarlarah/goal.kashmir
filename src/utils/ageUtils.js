/**
 * Calculates age based on Date of Birth
 * @param {string} dobString - Date of birth in YYYY-MM-DD format
 * @returns {number|null} - Calculated age or null if invalid
 */
export const calculateAge = (dobString) => {
    if (!dobString) return null;

    const dob = new Date(dobString);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
};

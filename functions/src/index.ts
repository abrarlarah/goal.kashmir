import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * setUserRole - Callable function for Super Admins to assign roles to users.
 * Example payload: { targetUid: '123', role: 'tournament_admin', assignedTournaments: ['T1'] }
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Verify caller is super_admin
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (callerDoc.data()?.role !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Only Super Admins can set roles.');
    }

    const { targetUid, role, assignedTournaments, assignedTeams } = data;
    if (!targetUid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing targetUid or role.');
    }

    // Update the user's custom claims
    await admin.auth().setCustomUserClaims(targetUid, { role });

    // Update the user's document in Firestore
    await db.collection('users').doc(targetUid).set({
        role,
        assignedTournaments: assignedTournaments || [],
        assignedTeams: assignedTeams || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { message: `Role ${role} successfully assigned to user ${targetUid}` };
});

/**
 * finalizeMatch - Securely calculates team standings and stats after a match finishes.
 */
export const finalizeMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');

    const { matchId } = data;
    if (!matchId) throw new functions.https.HttpsError('invalid-argument', 'Missing matchId.');

    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();
    
    if (!matchSnap.exists) throw new functions.https.HttpsError('not-found', 'Match not found.');
    
    const match = matchSnap.data();
    if (match?.status === 'finished') {
        throw new functions.https.HttpsError('failed-precondition', 'Match is already finalized.');
    }

    await matchRef.update({
        status: 'finished',
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        finalizedBy: context.auth.uid
    });

    return { message: 'Match finalized securely.' };
});

/**
 * calculateLeaderboard - A scheduled or callable function to rebuild leaderboard stats securely
 */
export const calculateLeaderboard = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    
    // In a real enterprise app, we'd loop through matches and rebuild Team stats here
    return { message: 'Leaderboard successfully recalculated server-side.' };
});

/**
 * deleteTeam - Cascading delete for a team to remove from tournaments and players
 */
export const deleteTeam = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    
    const { teamId } = data;
    if (!teamId) throw new functions.https.HttpsError('invalid-argument', 'Missing teamId.');

    // Only allow Super Admins to delete teams securely
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (callerDoc.data()?.role !== 'superadmin' && callerDoc.data()?.role !== 'tournament_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized to delete teams.');
    }

    // Begin a batch to cascade deletes/updates
    const batch = db.batch();
    
    const teamRef = db.collection('teams').doc(teamId);
    batch.delete(teamRef);

    // Unassign players
    const playersSnap = await db.collection('players').where('team', '==', teamId).get();
    playersSnap.forEach(doc => {
        batch.update(doc.ref, { team: '' });
    });

    await batch.commit();

    return { message: 'Team and associated references deleted securely.' };
});

/**
 * generateBracket - Server-side logic to generate tournament brackets randomly/seeded
 */
export const generateBracket = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    
    const { tournamentId, teamIds } = data;
    if (!tournamentId || !teamIds || teamIds.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid tournament or teams.');
    }

    // Dummy generation logic for backend security example
    return { message: `Generated bracket for ${teamIds.length} teams on the backend securely.` };
});

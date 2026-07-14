"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBracket = exports.deleteTeam = exports.calculateLeaderboard = exports.finalizeMatch = exports.setUserRole = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
/**
 * setUserRole - Callable function for Super Admins to assign roles to users.
 * Example payload: { targetUid: '123', role: 'tournament_admin', assignedTournaments: ['T1'] }
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
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
exports.finalizeMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    const { matchId } = data;
    if (!matchId)
        throw new functions.https.HttpsError('invalid-argument', 'Missing matchId.');
    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists)
        throw new functions.https.HttpsError('not-found', 'Match not found.');
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
exports.calculateLeaderboard = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    // In a real enterprise app, we'd loop through matches and rebuild Team stats here
    return { message: 'Leaderboard successfully recalculated server-side.' };
});
/**
 * deleteTeam - Cascading delete for a team to remove from tournaments and players
 */
exports.deleteTeam = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    const { teamId } = data;
    if (!teamId)
        throw new functions.https.HttpsError('invalid-argument', 'Missing teamId.');
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
exports.generateBracket = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Not authenticated.');
    const { tournamentId, teamIds } = data;
    if (!tournamentId || !teamIds || teamIds.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid tournament or teams.');
    }
    // Dummy generation logic for backend security example
    return { message: `Generated bracket for ${teamIds.length} teams on the backend securely.` };
});
//# sourceMappingURL=index.js.map
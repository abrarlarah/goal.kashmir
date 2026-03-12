import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Logs an admin action to the audit_logs Firestore collection.
 *
 * @param {string} action - e.g. 'CREATE_PLAYER', 'UPDATE_TEAM', 'DELETE_TOURNAMENT'
 * @param {Object} params
 * @param {string} params.entityType - 'player' | 'team' | 'tournament' | 'user'
 * @param {string} params.entityId - Firestore document ID of the affected record
 * @param {string} params.entityName - Human-readable name (player name, team name, etc.)
 * @param {Object} [params.details] - Optional extra metadata (e.g. changed fields)
 */
export async function logAuditEvent(action, { entityType, entityId, entityName, details } = {}) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'audit_logs'), {
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      entityName: entityName || null,
      adminUid: user?.uid || null,
      adminEmail: user?.email || null,
      timestamp: serverTimestamp(),
      details: details || null,
    });
  } catch (error) {
    // Audit logging should never block the main operation
    console.error('Audit log write failed:', error);
  }
}

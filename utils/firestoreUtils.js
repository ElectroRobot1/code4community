/**
 * Reusable Firestore operation utilities
 * Consolidates common Firestore patterns and error handling
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { handleError, createValidationError } from './errorHandlingUtils';

/**
 * Generic Firestore operation wrapper with error handling
 * 
 * @param {Function} operation - Firestore operation to execute
 * @param {Object} options - Operation options
 * @returns {Promise} - Operation result
 */
async function executeFirestoreOperation(operation, options = {}) {
  const {
    context = {},
    showAlert = true,
    onError = null
  } = options;

  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, {
      context: { ...context, operation: 'firestore' },
      showAlert,
      onError
    });
  }
}

/**
 * Get a single document from Firestore
 * 
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {Object} options - Operation options
 * @returns {Promise} - Document data or error
 */
export async function getDocument(collectionName, docId, options = {}) {
  return executeFirestoreOperation(
    async () => {
      const docRef = doc(firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw createValidationError(`Document ${docId} not found in ${collectionName}`);
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    },
    { ...options, context: { collection: collectionName, docId } }
  );
}

/**
 * Get multiple documents from a collection
 * 
 * @param {string} collectionName - Collection name
 * @param {Array} constraints - Query constraints
 * @param {Object} options - Operation options
 * @returns {Promise} - Array of documents or error
 */
export async function getDocuments(collectionName, constraints = [], options = {}) {
  return executeFirestoreOperation(
    async () => {
      const collectionRef = collection(firestore, collectionName);
      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    { ...options, context: { collection: collectionName, constraints } }
  );
}

/**
 * Add a new document to a collection
 * 
 * @param {string} collectionName - Collection name
 * @param {Object} data - Document data
 * @param {Object} options - Operation options
 * @returns {Promise} - Document reference or error
 */
export async function addDocument(collectionName, data, options = {}) {
  return executeFirestoreOperation(
    async () => {
      const collectionRef = collection(firestore, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return { id: docRef.id, ...data };
    },
    { ...options, context: { collection: collectionName, data } }
  );
}

/**
 * Update an existing document
 * 
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Update data
 * @param {Object} options - Operation options
 * @returns {Promise} - Success or error
 */
export async function updateDocument(collectionName, docId, data, options = {}) {
  return executeFirestoreOperation(
    async () => {
      const docRef = doc(firestore, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      
      return { id: docId, ...data };
    },
    { ...options, context: { collection: collectionName, docId, data } }
  );
}

/**
 * Delete a document
 * 
 * @param {string} collectionName - Collection name
 * @param {string} docId - Document ID
 * @param {Object} options - Operation options
 * @returns {Promise} - Success or error
 */
export async function deleteDocument(collectionName, docId, options = {}) {
  return executeFirestoreOperation(
    async () => {
      const docRef = doc(firestore, collectionName, docId);
      await deleteDoc(docRef);
      
      return { success: true, id: docId };
    },
    { ...options, context: { collection: collectionName, docId } }
  );
}

/**
 * Execute a batch write operation
 * 
 * @param {Array} operations - Array of batch operations
 * @param {Object} options - Operation options
 * @returns {Promise} - Batch result or error
 */
export async function executeBatch(operations, options = {}) {
  return executeFirestoreOperation(
    async () => {
      const batch = writeBatch(firestore);
      
      operations.forEach(({ type, collectionName, docId, data }) => {
        const docRef = doc(firestore, collectionName, docId);
        
        switch (type) {
          case 'set':
            batch.set(docRef, { ...data, updatedAt: new Date() });
            break;
          case 'update':
            batch.update(docRef, { ...data, updatedAt: new Date() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            throw createValidationError(`Invalid batch operation type: ${type}`);
        }
      });
      
      await batch.commit();
      return { success: true, operationsCount: operations.length };
    },
    { ...options, context: { operations } }
  );
}

/**
 * Create a real-time listener for a collection
 * 
 * @param {string} collectionName - Collection name
 * @param {Array} constraints - Query constraints
 * @param {Function} onUpdate - Callback for updates
 * @param {Object} options - Operation options
 * @returns {Function} - Unsubscribe function
 */
export function createListener(collectionName, constraints, onUpdate, options = {}) {
  const {
    onError = null,
    context = {}
  } = options;

  try {
    const collectionRef = collection(firestore, collectionName);
    const q = query(collectionRef, ...constraints);
    
    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUpdate(docs);
      },
      (error) => {
        console.error(`[FirestoreListener] Error in ${collectionName}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );
  } catch (error) {
    console.error(`[FirestoreListener] Failed to create listener for ${collectionName}:`, error);
    if (onError) {
      onError(error);
    }
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Common query builders
 */
export const QueryBuilder = {
  /**
   * Build a query with common constraints
   * @param {string} collectionName - Collection name
   * @param {Object} params - Query parameters
   * @returns {Array} - Query constraints
   */
  buildQuery: (collectionName, params = {}) => {
    const constraints = [];
    
    // Add where clauses
    if (params.where) {
      Object.entries(params.where).forEach(([field, value]) => {
        constraints.push(where(field, '==', value));
      });
    }
    
    // Add ordering
    if (params.orderBy) {
      const { field, direction = 'asc' } = params.orderBy;
      constraints.push(orderBy(field, direction));
    }
    
    // Add limit
    if (params.limit) {
      constraints.push(limit(params.limit));
    }
    
    return constraints;
  },

  /**
   * Build a query for user-specific data
   * @param {string} collectionName - Collection name
   * @param {string} userId - User ID
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Array} - Query constraints
   */
  buildUserQuery: (collectionName, userId, additionalParams = {}) => {
    return QueryBuilder.buildQuery(collectionName, {
      where: { userId },
      ...additionalParams
    });
  }
};

/**
 * Pre-built common operations
 */
export const CommonOperations = {
  /**
   * Get user data
   * @param {string} userId - User ID
   * @param {Object} options - Operation options
   * @returns {Promise} - User data or error
   */
  getUserData: (userId, options = {}) => 
    getDocument('users', userId, options),

  /**
   * Get tutoring requests for a user
   * @param {string} userId - User ID
   * @param {string} role - User role (student/tutor)
   * @param {Object} options - Operation options
   * @returns {Promise} - Requests or error
   */
  getTutoringRequests: (userId, role, options = {}) => {
    const field = role === 'student' ? 'studentId' : 'tutorId';
    const constraints = QueryBuilder.buildQuery('tutoringRequests', {
      where: { [field]: userId },
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 50
    });
    
    return getDocuments('tutoringRequests', constraints, options);
  },

  /**
   * Get completed sessions for a user
   * @param {string} userId - User ID
   * @param {string} role - User role (student/tutor)
   * @param {Object} options - Operation options
   * @returns {Promise} - Sessions or error
   */
  getCompletedSessions: (userId, role, options = {}) => {
    const field = role === 'student' ? 'studentId' : 'tutorId';
    const constraints = QueryBuilder.buildQuery('completedSessions', {
      where: { [field]: userId },
      orderBy: { field: 'completedAt', direction: 'desc' },
      limit: 50
    });
    
    return getDocuments('completedSessions', constraints, options);
  }
};

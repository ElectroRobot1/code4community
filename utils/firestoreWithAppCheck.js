// Firestore operations with App Check token integration
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { ensureFirestoreAppCheckToken } from './firestoreAppCheck';

// Store the original Firestore instance
const originalFirestore = firestore;

/**
 * Wraps Firestore operations to include App Check tokens
 */
class FirestoreWithAppCheck {
  constructor(firestoreInstance) {
    this.firestore = firestoreInstance;
  }

  // Override the app property to include App Check token
  get app() {
    return {
      ...this.firestore.app,
      _delegate: {
        ...this.firestore.app._delegate,
        _options: {
          ...this.firestore.app._delegate._options,
          // This is where we would inject the App Check token
          // However, this approach is complex and may not work
        }
      }
    };
  }

  // For now, we'll use a different approach
  // We'll create wrapper functions that ensure App Check tokens are available
  async ensureAppCheckToken() {
    const token = await ensureFirestoreAppCheckToken();
    if (!token) {
      throw new Error('App Check token is required for Firestore operations');
    }
    return token;
  }

  // Wrapper for doc operations
  doc(path, ...pathSegments) {
    return doc(this.firestore, path, ...pathSegments);
  }

  // Wrapper for collection operations
  collection(path, ...pathSegments) {
    return collection(this.firestore, path, ...pathSegments);
  }

  // Wrapper for getDoc
  async getDoc(docRef) {
    await this.ensureAppCheckToken();
    return getDoc(docRef);
  }

  // Wrapper for setDoc
  async setDoc(docRef, data, options) {
    await this.ensureAppCheckToken();
    return setDoc(docRef, data, options);
  }

  // Wrapper for updateDoc
  async updateDoc(docRef, data) {
    await this.ensureAppCheckToken();
    return updateDoc(docRef, data);
  }

  // Wrapper for deleteDoc
  async deleteDoc(docRef) {
    await this.ensureAppCheckToken();
    return deleteDoc(docRef);
  }

  // Wrapper for addDoc
  async addDoc(collectionRef, data) {
    await this.ensureAppCheckToken();
    return addDoc(collectionRef, data);
  }

  // Wrapper for getDocs
  async getDocs(queryRef) {
    await this.ensureAppCheckToken();
    return getDocs(queryRef);
  }

  // Wrapper for onSnapshot
  onSnapshot(queryRef, callback, errorCallback) {
    // For real-time listeners, we need to ensure token is available
    this.ensureAppCheckToken().then(() => {
      return onSnapshot(queryRef, callback, errorCallback);
    }).catch(error => {
      if (errorCallback) errorCallback(error);
    });
  }

  // Wrapper for writeBatch
  writeBatch() {
    return writeBatch(this.firestore);
  }

  // Query builders (these don't need tokens)
  query(collectionRef, ...queryConstraints) {
    return query(collectionRef, ...queryConstraints);
  }

  where(field, op, value) {
    return where(field, op, value);
  }

  orderBy(field, direction) {
    return orderBy(field, direction);
  }

  limit(limitCount) {
    return limit(limitCount);
  }
}

// Create the wrapped Firestore instance
const firestoreWithAppCheck = new FirestoreWithAppCheck(originalFirestore);

export default firestoreWithAppCheck;

// Export individual functions for convenience
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  writeBatch
};

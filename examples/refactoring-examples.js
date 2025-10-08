/**
 * Example implementation showing how to use the new reusable utilities
 * This demonstrates how to refactor existing code to use the consolidated utilities
 */

// BEFORE: Original code with repeated patterns
// AFTER: Refactored code using reusable utilities

// ============================================================================
// EXAMPLE 1: Authentication Redirect Pattern
// ============================================================================

// BEFORE (repeated in every protected page):
/*
useEffect(() => {
  if (!user && !cachedUser) {
    router.push('/login?redirectTo=/mathlab');
  }
}, [user, cachedUser, router]);
*/

// AFTER (using useAuthRedirect hook):
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

function MathLabPage() {
  const { isAuthenticated, isLoading, user, userData } = useAuthRedirect('/mathlab');
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null; // Will redirect automatically
  
  // Rest of component logic...
}

// ============================================================================
// EXAMPLE 2: User Cache Management Pattern
// ============================================================================

// BEFORE (repeated in every page):
/*
const [cachedUser, setCachedUser] = useState(null);

useEffect(() => {
  const timing = CachePerformance.startTiming('loadCachedUser');
  const cached = UserCache.getUserData();
  if (cached) {
    setCachedUser(cached);
  }
  CachePerformance.endTiming(timing);
}, []);

useEffect(() => {
  if (userData && user) {
    const timing = CachePerformance.startTiming('updateUserCache');
    const combinedUserData = {
      ...userData,
      uid: user.uid,
      email: user.email
    };
    UserCache.setUserData(combinedUserData);
    setCachedUser(combinedUserData);
    CachePerformance.endTiming(timing);
  }
}, [userData, user]);
*/

// AFTER (using useUserCache hook):
import { useUserCache } from '@/hooks/useUserCache';

function AdminPage() {
  const { cachedUser, refreshCache, isLoading } = useUserCache({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });
  
  // Rest of component logic...
}

// ============================================================================
// EXAMPLE 3: Error Handling Pattern
// ============================================================================

// BEFORE (repeated error handling):
/*
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  console.error("Error performing operation:", error);
  alert("Failed to perform operation. Please try again.");
}
*/

// AFTER (using centralized error handling):
import { handleError, withErrorHandling, createErrorHandler } from '@/utils/errorHandlingUtils';

// Option 1: Using handleError
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  handleError(error, {
    context: { operation: 'someAsyncOperation' },
    showAlert: true
  });
}

// Option 2: Using withErrorHandling wrapper
const safeOperation = withErrorHandling(someAsyncOperation, {
  context: { operation: 'someAsyncOperation' },
  showAlert: true
});

const result = await safeOperation();

// Option 3: Using error handler hook
const errorHandler = createErrorHandler({
  showAlert: true,
  onError: (error, message) => {
    // Custom error handling
  }
});

// ============================================================================
// EXAMPLE 4: Loading State Management Pattern
// ============================================================================

// BEFORE (repeated loading state management):
/*
const [isLoading, setIsLoading] = useState(true);
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitData();
  } catch (error) {
    // Handle error
  } finally {
    setIsSubmitting(false);
  }
};
*/

// AFTER (using useLoadingState hook):
import { useLoadingState, useAsyncOperation } from '@/hooks/useLoadingState';

function SettingsPage() {
  const { isLoading, setLoading, withLoading } = useLoadingState({
    isLoading: true,
    isSubmitting: false,
    isUpdating: false
  });

  const handleSubmit = async () => {
    await withLoading(
      () => submitData(),
      {
        loadingKey: 'isSubmitting',
        onSuccess: (result) => {
          // Handle success
        },
        onError: (error) => {
          // Handle error
        }
      }
    );
  };

  // Or using useAsyncOperation for simpler cases:
  const { isLoading: isSubmitting, execute: submitForm } = useAsyncOperation(
    submitData,
    {
      onSuccess: (result) => {
        // Handle success
      },
      onError: (error) => {
        // Handle error
      }
    }
  );
}

// ============================================================================
// EXAMPLE 5: Firestore Operations Pattern
// ============================================================================

// BEFORE (repeated Firestore operations):
/*
const fetchTutoringRequests = async () => {
  try {
    const q = query(
      collection(firestore, "tutoringRequests"),
      where("studentId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRequests(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    alert("Failed to load requests. Please try again.");
  }
};
*/

// AFTER (using Firestore utilities):
import { CommonOperations, getDocuments, QueryBuilder } from '@/utils/firestoreUtils';

function MathLabPage() {
  const fetchTutoringRequests = async () => {
    const result = await CommonOperations.getTutoringRequests(userId, 'student');
    
    if (result.success) {
      setRequests(result.data);
    } else {
      // Error is already handled by the utility
    }
  };

  // Or for custom queries:
  const fetchCustomRequests = async () => {
    const constraints = QueryBuilder.buildQuery('tutoringRequests', {
      where: { studentId: userId, status: 'pending' },
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 20
    });
    
    const result = await getDocuments('tutoringRequests', constraints);
    
    if (result.success) {
      setRequests(result.data);
    }
  };
}

// ============================================================================
// EXAMPLE 6: Form Validation Pattern
// ============================================================================

// BEFORE (repeated validation logic):
/*
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  
  if (!formData.email) {
    newErrors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    newErrors.email = 'Please enter a valid email';
  }
  
  if (!formData.password) {
    newErrors.password = 'Password is required';
  } else if (formData.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
*/

// AFTER (using validation utilities):
import { useFormValidation, CommonValidators } from '@/utils/validationUtils';

function SignupPage() {
  const {
    formData,
    errors,
    isValid,
    updateField,
    getFieldError,
    hasFieldError
  } = useFormValidation(
    { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
    VALIDATION_SCHEMAS.USER_REGISTRATION
  );

  const handleSubmit = async () => {
    if (!isValid) return;
    
    // Form is valid, proceed with submission
    const result = await submitRegistration(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
        className={hasFieldError('firstName') ? 'error' : ''}
      />
      {getFieldError('firstName') && (
        <span className="error-message">{getFieldError('firstName')}</span>
      )}
      
      {/* Similar pattern for other fields */}
    </form>
  );
}

// ============================================================================
// COMPLETE REFACTORED COMPONENT EXAMPLE
// ============================================================================

// This shows how a complete component would look using all the utilities:

import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useUserCache } from '@/hooks/useUserCache';
import { useLoadingState } from '@/hooks/useLoadingState';
import { CommonOperations } from '@/utils/firestoreUtils';
import { handleError } from '@/utils/errorHandlingUtils';

function RefactoredMathLabPage() {
  // Authentication and redirects
  const { isAuthenticated, isLoading: authLoading, user, userData } = useAuthRedirect('/mathlab');
  
  // User cache management
  const { cachedUser, refreshCache } = useUserCache();
  
  // Loading states
  const { isLoading, setLoading, withLoading } = useLoadingState({
    isLoading: true,
    isSubmitting: false,
    isMatching: false
  });
  
  // State
  const [requests, setRequests] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  
  // Fetch requests with error handling
  const fetchRequests = useCallback(async () => {
    const result = await withLoading(
      () => CommonOperations.getTutoringRequests(user?.uid, 'student'),
      {
        loadingKey: 'isLoading',
        onError: (error) => {
          handleError(error, {
            context: { operation: 'fetchRequests', userId: user?.uid },
            showAlert: true
          });
        }
      }
    );
    
    if (result.success) {
      setRequests(result.data);
    }
  }, [user?.uid, withLoading]);
  
  // Submit request with error handling
  const handleSubmitRequest = useCallback(async (requestData) => {
    const result = await withLoading(
      () => CommonOperations.addDocument('tutoringRequests', requestData),
      {
        loadingKey: 'isSubmitting',
        onSuccess: () => {
          fetchRequests(); // Refresh the list
        },
        onError: (error) => {
          handleError(error, {
            context: { operation: 'submitRequest', data: requestData },
            showAlert: true
          });
        }
      }
    );
  }, [withLoading, fetchRequests]);
  
  // Load data on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRequests();
    }
  }, [isAuthenticated, user, fetchRequests]);
  
  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect automatically
  }
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}

export default RefactoredMathLabPage;

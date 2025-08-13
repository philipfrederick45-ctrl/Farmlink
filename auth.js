// FarmLink GH Authentication System
class FarmLinkAuth {
  constructor() {
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      // Initialize Firebase
      const firebase = await window.initializeFirebase();
      this.auth = firebase.auth;
      this.db = firebase.db;
      
      // Set up auth state listener
      this.setupAuthStateListener();
      
      // Initialize auth forms
      this.setupAuthForms();
      
      console.log('FarmLink Auth initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FarmLink Auth:', error);
      this.showError('Failed to initialize authentication system');
    }
  }

  setupAuthStateListener() {
    if (!this.auth) return;
    
    this.auth.onAuthStateChanged(async (user) => {
      this.currentUser = user;
      
      if (user) {
        console.log('User signed in:', user.email);
        // Create/update user profile in database
        await this.ensureUserProfile(user);
        
        // Redirect to dashboard if on auth pages
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname.includes('signup.html')) {
          window.location.href = 'dashboard.html';
        }
      } else {
        console.log('User signed out');
        // Redirect to login if on protected pages
        if (window.location.pathname.includes('dashboard.html')) {
          window.location.href = 'login.html';
        }
      }
    });
  }

  async ensureUserProfile(user) {
    try {
      // Dynamically import Firebase functions
      const { doc, getDoc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const userRef = doc(this.db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile
        const userProfile = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || '',
          role: 'Farmer', // Default role
          phone: '',
          location: '',
          farmSize: '',
          farmType: '',
          experience: '',
          bio: '',
          profileImage: user.photoURL || '',
          stats: {
            totalListings: 0,
            pendingOrders: 0,
            rating: 0,
            totalBuyers: 0,
            totalSales: 0,
            totalRevenue: 0,
            completedOrders: 0,
            customerReviews: 0
          },
          preferences: {
            notifications: true,
            emailUpdates: true,
            marketAlerts: true
          },
          achievements: [],
          createdAt: Date.now(),
          lastActive: Date.now(),
          dashboard: {
            recentActivity: [],
            upcomingTasks: [],
            marketInsights: null,
            weatherAlerts: [],
            financialSummary: {
              monthlyRevenue: null,
              monthlyExpenses: null,
              profitMargin: null
            },
            inventory: {
              totalProducts: 0,
              lowStockItems: [],
              outOfStockItems: []
            },
            orders: {
              pending: [],
              processing: [],
              completed: []
            }
          }
        };
        
        await setDoc(userRef, userProfile);
        console.log('User profile created successfully');
      } else {
        // Update last active timestamp
        await updateDoc(userRef, { lastActive: Date.now() });
        console.log('User profile updated');
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }

  setupAuthForms() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Google auth buttons
    const googleLoginBtn = document.getElementById('btn-google-login');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => this.signInWithGoogle());
    }

    const googleSignupBtn = document.getElementById('btn-google-signup');
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', () => this.signInWithGoogle());
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.signOut());
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.target);
      const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
      const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
      
      if (!email || !password) {
        this.showError('Please fill in all fields');
        return;
      }
      
      this.showLoading('Signing in...');
      
      // Sign in with email/password
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signInWithEmailAndPassword(this.auth, email, password);
      
      this.showSuccess('Login successful! Redirecting...');
      
    } catch (error) {
      console.error('Login error:', error);
      this.showError(this.getErrorMessage(error.code));
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.target);
      const fullName = formData.get('fullName') || e.target.querySelector('input[type="text"]').value;
      const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
      const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
      const confirmPassword = formData.get('confirmPassword') || e.target.querySelectorAll('input[type="password"]')[1].value;
      const role = formData.get('role') || e.target.querySelector('select').value;
      
      if (!fullName || !email || !password || !confirmPassword || !role) {
        this.showError('Please fill in all fields');
        return;
      }
      
      if (password !== confirmPassword) {
        this.showError('Passwords do not match');
        return;
      }
      
      if (password.length < 6) {
        this.showError('Password must be at least 6 characters long');
        return;
      }
      
      this.showLoading('Creating account...');
      
      // Create user with email/password
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: fullName
      });
      
      // Update user profile in database with role
      const userRef = doc(this.db, 'users', userCredential.user.uid);
      await updateDoc(userRef, { 
        fullName: fullName,
        role: role
      });
      
      this.showSuccess('Account created successfully! Redirecting...');
      
    } catch (error) {
      console.error('Signup error:', error);
      this.showError(this.getErrorMessage(error.code));
    }
  }

  async signInWithGoogle() {
    try {
      this.showLoading('Signing in with Google...');
      
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      
      const result = await signInWithPopup(this.auth, provider);
      
      // Check if this is a new user
      if (result._tokenResponse?.isNewUser) {
        // Update user profile with default role
        const userRef = doc(this.db, 'users', result.user.uid);
        await updateDoc(userRef, { 
          role: 'Farmer' // Default role for Google sign-ins
        });
      }
      
      this.showSuccess('Google sign-in successful! Redirecting...');
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      this.showError(this.getErrorMessage(error.code));
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      this.showSuccess('Signed out successfully');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Sign out error:', error);
      this.showError('Failed to sign out');
    }
  }

  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password is too weak',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/popup-closed-by-user': 'Sign-in popup was closed',
      'auth/cancelled-popup-request': 'Sign-in was cancelled',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/user-disabled': 'This account has been disabled',
      'auth/operation-not-allowed': 'This sign-in method is not allowed',
      'auth/invalid-credential': 'Invalid credentials'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }

  showLoading(message) {
    // Show loading state
    const submitBtns = document.querySelectorAll('button[type="submit"]');
    submitBtns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line"></i> ' + message;
    });
  }

  showSuccess(message) {
    // Show success message
    this.showToast(message, 'success');
  }

  showError(message) {
    // Show error message
    this.showToast(message, 'error');
    
    // Re-enable submit buttons
    const submitBtns = document.querySelectorAll('button[type="submit"]');
    submitBtns.forEach(btn => {
      btn.disabled = false;
      if (btn.textContent.includes('Login')) {
        btn.textContent = 'Login';
      } else if (btn.textContent.includes('Sign Up')) {
        btn.textContent = 'Sign Up';
      }
    });
  }

  showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Get user profile from database
  async getUserProfile(uid) {
    try {
      // Dynamically import Firebase functions
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const userRef = doc(this.db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.farmLinkAuth = new FarmLinkAuth();
});

// Firebase functions will be loaded dynamically

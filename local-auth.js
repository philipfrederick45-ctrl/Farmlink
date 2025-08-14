// FarmLink Local Authentication System
// Replaces Firebase authentication with local user management

class LocalAuth {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.init();
  }

  async init() {
    try {
      // Wait for local database to be ready
      if (window.localDB) {
        this.setupAuthStateListener();
        this.setupAuthForms();
        console.log('Local Auth initialized successfully');
      } else {
        // Wait for database to be ready
        document.addEventListener('DOMContentLoaded', () => {
          if (window.localDB) {
            this.setupAuthStateListener();
            this.setupAuthForms();
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize Local Auth:', error);
    }
  }

  setupAuthStateListener() {
    // Check if user is already logged in (from localStorage)
    const savedUser = this.getSavedUser();
    if (savedUser) {
      this.currentUser = savedUser;
      this.loadUserProfile(savedUser.uid);
      this.onAuthStateChanged(savedUser);
    }
  }

  setupAuthForms() {
    // Set up login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Set up signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Set up logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn, [data-action="logout"]');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleLogout(e));
    });
  }

  async handleSignup(e) {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const fullName = formData.get('fullName') || formData.get('name') || '';

      // Validate input
      if (!email || !password) {
        this.showError('Please fill in all required fields');
        return;
      }

      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        this.showError('User with this email already exists');
        return;
      }

      // Create new user
      const userData = {
        uid: this.generateUID(),
        email,
        password: await this.hashPassword(password),
        fullName,
        createdAt: Date.now()
      };

      // Create user profile in local database
      const userProfile = await window.localDB.createUser(userData);
      
      // Log user in
      this.currentUser = userData;
      this.userProfile = userProfile;
      this.saveUser(userData);
      
      // Trigger auth state change
      this.onAuthStateChanged(userData);
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
      
      console.log('User signed up successfully:', userData);
    } catch (error) {
      console.error('Signup error:', error);
      this.showError('Failed to create account. Please try again.');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');

      // Validate input
      if (!email || !password) {
        this.showError('Please fill in all required fields');
        return;
      }

      // Find user by email
      const user = await this.findUserByEmail(email);
      if (!user) {
        this.showError('Invalid email or password');
        return;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        this.showError('Invalid email or password');
        return;
      }

      // Log user in
      this.currentUser = user;
      await this.loadUserProfile(user.uid);
      this.saveUser(user);
      
      // Trigger auth state change
      this.onAuthStateChanged(user);
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
      
      console.log('User logged in successfully:', user);
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Failed to log in. Please try again.');
    }
  }

  async handleLogout(e) {
    e.preventDefault();
    
    try {
      // Clear current user
      this.currentUser = null;
      this.userProfile = null;
      this.clearSavedUser();
      
      // Trigger auth state change
      this.onAuthStateChanged(null);
      
      // Redirect to login
      window.location.href = 'login.html';
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async loadUserProfile(uid) {
    try {
      if (window.localDB) {
        this.userProfile = await window.localDB.getUser(uid);
        console.log('User profile loaded:', this.userProfile);
        return this.userProfile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates) {
    try {
      if (window.localDB && this.currentUser) {
        const updatedProfile = await window.localDB.updateUser(this.currentUser.uid, updates);
        this.userProfile = updatedProfile;
        console.log('User profile updated:', updatedProfile);
        return updatedProfile;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      if (window.localDB) {
        // Get all users and find by email
        const users = await window.localDB.getAllData('users');
        return users.find(user => user.email === email) || null;
      }
      return null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  // Password hashing (simple implementation for demo)
  async hashPassword(password) {
    // In a real app, use proper password hashing
    // For demo purposes, we'll use a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password, hashedPassword) {
    const hashedInput = await this.hashPassword(password);
    return hashedInput === hashedPassword;
  }

  // Generate unique user ID
  generateUID() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Local storage management
  saveUser(user) {
    try {
      localStorage.setItem('farmlink_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  }

  getSavedUser() {
    try {
      const saved = localStorage.getItem('farmlink_user');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
      return null;
    }
  }

  clearSavedUser() {
    try {
      localStorage.removeItem('farmlink_user');
    } catch (error) {
      console.error('Error clearing user from localStorage:', error);
    }
  }

  // Auth state change callback
  onAuthStateChanged(user) {
    // Update UI based on auth state
    if (user) {
      this.showAuthenticatedUI();
    } else {
      this.showUnauthenticatedUI();
    }

    // Dispatch custom event for other components
    const event = new CustomEvent('authStateChanged', { detail: { user } });
    document.dispatchEvent(event);
  }

  showAuthenticatedUI() {
    // Show user-specific elements
    const userElements = document.querySelectorAll('[data-user]');
    userElements.forEach(el => {
      el.style.display = 'block';
    });

    // Hide guest elements
    const guestElements = document.querySelectorAll('[data-guest]');
    guestElements.forEach(el => {
      el.style.display = 'none';
    });

    // Update user info in navigation
    this.updateNavigationForUser();
  }

  showUnauthenticatedUI() {
    // Hide user-specific elements
    const userElements = document.querySelectorAll('[data-user]');
    userElements.forEach(el => {
      el.style.display = 'none';
    });

    // Show guest elements
    const guestElements = document.querySelectorAll('[data-guest]');
    guestElements.forEach(el => {
      el.style.display = 'block';
    });

    // Update navigation for guests
    this.updateNavigationForGuest();
  }

  updateNavigationForUser() {
    const navCta = document.querySelector('.nav-cta');
    if (navCta && this.currentUser) {
      navCta.innerHTML = `
        <div class="user-menu">
          <span class="user-name">${this.currentUser.fullName || this.currentUser.email}</span>
          <button class="logout-btn btn btn-outline">Logout</button>
        </div>
      `;
      
      // Re-attach logout event
      const logoutBtn = navCta.querySelector('.logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
      }
    }
  }

  updateNavigationForGuest() {
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
      navCta.innerHTML = `
        <a href="login.html" class="btn btn-outline">Login</a>
        <a href="signup.html" class="btn btn-primary">Sign Up</a>
      `;
    }
  }

  // Error handling
  showError(message) {
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(el => el.remove());

    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message alert alert-danger';
    errorDiv.textContent = message;

    // Insert error message after form
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (form.querySelector('.error-message')) {
        form.querySelector('.error-message').remove();
      }
      form.insertAdjacentElement('afterend', errorDiv.cloneNode(true));
    });

    // Auto-remove error after 5 seconds
    setTimeout(() => {
      const errors = document.querySelectorAll('.error-message');
      errors.forEach(el => el.remove());
    }, 5000);
  }

  // Public methods for other components
  getCurrentUser() {
    return this.currentUser;
  }

  getUserProfile() {
    return this.userProfile;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  // Method to check if user is on a protected page
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
}

// Initialize and export
const localAuth = new LocalAuth();
window.localAuth = localAuth;

// Export for use in other scripts
window.LocalAuth = LocalAuth;


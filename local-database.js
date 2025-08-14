// FarmLink Local Database System
// Replaces Firebase with IndexedDB for local storage

class LocalDatabase {
  constructor() {
    this.dbName = 'FarmLinkDB';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  async init() {
    try {
      this.db = await this.openDatabase();
      console.log('Local database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize local database:', error);
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'uid' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Create products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          productStore.createIndex('userId', 'userId', { unique: false });
          productStore.createIndex('category', 'category', { unique: false });
        }

        // Create orders store
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
          orderStore.createIndex('userId', 'userId', { unique: false });
          orderStore.createIndex('status', 'status', { unique: false });
        }

        // Create activities store
        if (!db.objectStoreNames.contains('activities')) {
          const activityStore = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
          activityStore.createIndex('userId', 'userId', { unique: false });
          activityStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // User management
  async createUser(userData) {
    try {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      
      const userProfile = {
        uid: userData.uid,
        email: userData.email,
        fullName: userData.displayName || '',
        role: 'Farmer',
        phone: '',
        location: '',
        farmSize: '',
        farmType: '',
        experience: '',
        bio: '',
        profileImage: userData.photoURL || '',
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

      await store.add(userProfile);
      console.log('User created successfully:', userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(uid) {
    try {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const user = await store.get(uid);
      return user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async updateUser(uid, updates) {
    try {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      
      const user = await store.get(uid);
      if (!user) throw new Error('User not found');
      
      const updatedUser = { ...user, ...updates, lastActive: Date.now() };
      await store.put(updatedUser);
      
      console.log('User updated successfully:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Product management
  async addProduct(userId, productData) {
    try {
      const transaction = this.db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      
      const product = {
        ...productData,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await store.add(product);
      console.log('Product added successfully:', { id, ...product });
      
      // Update user stats
      await this.updateUserStats(userId, 'totalListings', 1);
      await this.updateUserStats(userId, 'totalProducts', 1);
      
      return { id, ...product };
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  async getUserProducts(userId) {
    try {
      const transaction = this.db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const index = store.index('userId');
      const products = await index.getAll(userId);
      return products;
    } catch (error) {
      console.error('Error getting user products:', error);
      return [];
    }
  }

  async updateProduct(productId, updates) {
    try {
      const transaction = this.db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      
      const product = await store.get(productId);
      if (!product) throw new Error('Product not found');
      
      const updatedProduct = { ...product, ...updates, updatedAt: Date.now() };
      await store.put(updatedProduct);
      
      console.log('Product updated successfully:', updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId, userId) {
    try {
      const transaction = this.db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      
      await store.delete(productId);
      console.log('Product deleted successfully:', productId);
      
      // Update user stats
      await this.updateUserStats(userId, 'totalListings', -1);
      await this.updateUserStats(userId, 'totalProducts', -1);
      
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Order management
  async createOrder(userId, orderData) {
    try {
      const transaction = this.db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      
      const order = {
        ...orderData,
        userId,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await store.add(order);
      console.log('Order created successfully:', { id, ...order });
      
      // Update user stats
      await this.updateUserStats(userId, 'pendingOrders', 1);
      
      return { id, ...order };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getUserOrders(userId) {
    try {
      const transaction = this.db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const index = store.index('userId');
      const orders = await index.getAll(userId);
      return orders;
    } catch (error) {
      console.error('Error getting user orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const transaction = this.db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      
      const order = await store.get(orderId);
      if (!order) throw new Error('Order not found');
      
      const updatedOrder = { ...order, status, updatedAt: Date.now() };
      await store.put(updatedOrder);
      
      // Update user stats based on status change
      if (status === 'completed' && order.status !== 'completed') {
        await this.updateUserStats(order.userId, 'pendingOrders', -1);
        await this.updateUserStats(order.userId, 'completedOrders', 1);
        await this.updateUserStats(order.userId, 'totalRevenue', order.amount || 0);
      }
      
      console.log('Order status updated successfully:', updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Activity tracking
  async addActivity(userId, activityType, data) {
    try {
      const transaction = this.db.transaction(['activities'], 'readwrite');
      const store = transaction.objectStore('activities');
      
      const activity = {
        userId,
        type: activityType,
        data,
        timestamp: Date.now()
      };
      
      const id = await store.add(activity);
      console.log('Activity added successfully:', { id, ...activity });
      
      // Update user's recent activity
      await this.updateUserActivity(userId, activity);
      
      return { id, ...activity };
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  }

  async getUserActivities(userId, limit = 10) {
    try {
      const transaction = this.db.transaction(['activities'], 'readonly');
      const store = transaction.objectStore('activities');
      const index = store.index('userId');
      const activities = await index.getAll(userId);
      
      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  }

  // Helper functions
  async updateUserStats(userId, statField, increment) {
    try {
      const user = await this.getUser(userId);
      if (!user) return;
      
      const currentValue = user.stats[statField] || 0;
      const newValue = Math.max(0, currentValue + increment);
      
      await this.updateUser(userId, {
        stats: { ...user.stats, [statField]: newValue }
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  async updateUserActivity(userId, activity) {
    try {
      const user = await this.getUser(userId);
      if (!user) return;
      
      const recentActivity = [activity, ...user.dashboard.recentActivity].slice(0, 20);
      
      await this.updateUser(userId, {
        dashboard: { ...user.dashboard, recentActivity }
      });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  // Data export/import for backup
  async exportData() {
    try {
      const data = {
        users: await this.getAllData('users'),
        products: await this.getAllData('products'),
        orders: await this.getAllData('orders'),
        activities: await this.getAllData('activities')
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmlink-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      console.log('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Clear existing data
      await this.clearAllData();
      
      // Import new data
      if (data.users) {
        for (const user of data.users) {
          await this.createUser(user);
        }
      }
      
      if (data.products) {
        for (const product of data.products) {
          await this.addProduct(product.userId, product);
        }
      }
      
      if (data.orders) {
        for (const order of data.orders) {
          await this.createOrder(order.userId, order);
        }
      }
      
      if (data.activities) {
        for (const activity of data.activities) {
          await this.addActivity(activity.userId, activity.type, activity.data);
        }
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Error importing data:', error);
    }
  }

  async getAllData(storeName) {
    try {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      return await store.getAll();
    } catch (error) {
      console.error(`Error getting all ${storeName}:`, error);
      return [];
    }
  }

  async clearAllData() {
    try {
      const storeNames = ['users', 'products', 'orders', 'activities'];
      
      for (const storeName of storeNames) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.clear();
      }
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

// Initialize and export
const localDB = new LocalDatabase();
window.localDB = localDB;

// Export for use in other scripts
window.LocalDatabase = LocalDatabase;


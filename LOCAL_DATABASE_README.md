# FarmLink Local Database System

## Overview

This document explains the local database system that has replaced Firebase in FarmLink. The system now uses IndexedDB for local storage, providing offline functionality and data privacy.

## What Changed

### Before (Firebase)
- Cloud-based database (Firestore)
- Firebase Authentication
- Real-time synchronization
- Internet required
- Data stored on Google servers

### After (Local Database)
- Local IndexedDB storage
- Local authentication system
- Offline functionality
- No internet required
- Data stored locally in browser

## Architecture

### 1. Local Database (`local-database.js`)
- **IndexedDB**: Browser-based database for storing user data
- **Collections**: users, products, orders, activities
- **Features**: CRUD operations, data export/import, automatic stats updates

### 2. Local Authentication (`local-auth.js`)
- **User Management**: Sign up, login, logout
- **Password Hashing**: SHA-256 encryption
- **Session Management**: localStorage for persistent login
- **Form Handling**: Automatic form setup and validation

### 3. Main Application (`script.js`)
- **Integration**: Connects local database and auth
- **UI Updates**: Dynamic navigation, protected content
- **Dashboard**: Product management, data export/import

## Database Schema

### Users Collection
```javascript
{
  uid: "user_unique_id",
  email: "user@example.com",
  password: "hashed_password",
  fullName: "John Doe",
  role: "Farmer",
  stats: { totalListings: 0, pendingOrders: 0, ... },
  dashboard: { recentActivity: [], inventory: {}, ... },
  createdAt: 1234567890,
  lastActive: 1234567890
}
```

### Products Collection
```javascript
{
  id: 1,
  userId: "user_unique_id",
  name: "Fresh Tomatoes",
  price: 50,
  unit: "basket",
  stock: 100,
  category: "Vegetables",
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### Orders Collection
```javascript
{
  id: 1,
  userId: "user_unique_id",
  productName: "Fresh Tomatoes",
  buyer: "Buyer Name",
  amount: 50,
  status: "pending", // pending, processing, completed
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### Activities Collection
```javascript
{
  id: 1,
  userId: "user_unique_id",
  type: "product_added",
  data: { productName: "Fresh Tomatoes", price: 50 },
  timestamp: 1234567890
}
```

## Key Features

### 1. Offline Functionality
- All data operations work without internet
- Data persists between browser sessions
- Automatic data synchronization when online

### 2. Data Privacy
- All data stored locally in user's browser
- No data sent to external servers
- User controls their own data

### 3. Data Portability
- Export data as JSON file
- Import data from backup files
- Easy migration between devices

### 4. Automatic Stats
- Real-time statistics updates
- Activity tracking and logging
- Dashboard data persistence

## Usage

### Authentication
```javascript
// Check if user is logged in
if (window.localAuth.isAuthenticated()) {
  // User is logged in
}

// Get current user
const user = window.localAuth.getCurrentUser();

// Get user profile
const profile = window.localAuth.getUserProfile();
```

### Database Operations
```javascript
// Add a product
const product = await window.localDB.addProduct(userId, {
  name: "Fresh Tomatoes",
  price: 50,
  unit: "basket",
  stock: 100,
  category: "Vegetables"
});

// Get user products
const products = await window.localDB.getUserProducts(userId);

// Update user profile
await window.localDB.updateUser(userId, {
  fullName: "New Name",
  location: "Accra"
});
```

### Data Management
```javascript
// Export all data
await window.localDB.exportData();

// Import data from file
await window.localDB.importData(jsonData);

// Clear all data
await window.localDB.clearAllData();
```

## File Structure

```
farmlink/
├── local-database.js      # Local database system
├── local-auth.js          # Local authentication
├── script.js              # Main application logic
├── index.html             # Home page
├── login.html             # Login page
├── signup.html            # Signup page
├── dashboard.html         # User dashboard
├── marketplace.html       # Marketplace
└── styles.css             # Styling
```

## Browser Compatibility

- **Chrome**: 23+ (Full support)
- **Firefox**: 16+ (Full support)
- **Safari**: 10+ (Full support)
- **Edge**: 12+ (Full support)

## Security Considerations

### Password Hashing
- Passwords are hashed using SHA-256
- No plain text passwords stored
- Consider upgrading to bcrypt for production

### Data Validation
- Input validation on all forms
- Data sanitization before storage
- Error handling for malformed data

### Local Storage
- Session data stored in localStorage
- Automatic cleanup on logout
- No sensitive data in localStorage

## Migration from Firebase

### 1. Data Export
- Export existing Firebase data
- Convert to local database format
- Import using local database tools

### 2. Authentication
- Create new local accounts
- Migrate user profiles
- Update authentication flows

### 3. Testing
- Test all functionality offline
- Verify data persistence
- Check import/export features

## Troubleshooting

### Common Issues

1. **Database not initializing**
   - Check browser console for errors
   - Ensure IndexedDB is supported
   - Clear browser data and retry

2. **Authentication not working**
   - Check form IDs match expected values
   - Verify local storage permissions
   - Clear browser cache

3. **Data not persisting**
   - Check IndexedDB storage limits
   - Verify database initialization
   - Check for JavaScript errors

### Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('farmlink_debug', 'true');

// Check database status
console.log('Local DB:', window.localDB);
console.log('Local Auth:', window.localAuth);
```

## Future Enhancements

### 1. Data Synchronization
- Cloud backup options
- Multi-device sync
- Conflict resolution

### 2. Enhanced Security
- Stronger password hashing
- Data encryption
- Two-factor authentication

### 3. Performance
- Data compression
- Lazy loading
- Background sync

## Support

For issues or questions about the local database system:
1. Check browser console for errors
2. Verify all script files are loaded
3. Test in different browsers
4. Check IndexedDB support

## Benefits of Local Database

1. **Privacy**: User data stays on their device
2. **Offline**: Works without internet connection
3. **Performance**: Faster data access
4. **Cost**: No cloud hosting fees
5. **Control**: Users own their data
6. **Reliability**: No external service dependencies


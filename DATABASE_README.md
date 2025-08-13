# FarmLink Database System

## Overview

This document explains how the FarmLink database system works, specifically how user data is initialized and accumulated over time.

## How It Works

### 1. User Account Creation

When a user creates an account (either through email/password or Google sign-in), the system automatically creates a comprehensive user profile document in Firestore with the following structure:

```javascript
{
  uid: "user_unique_id",
  email: "user@example.com",
  role: "Farmer",
  fullName: "John Doe",
  phone: null,
  location: null,
  farmSize: null,
  farmType: null,
  experience: null,
  bio: null,
  profileImage: null,
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
  createdAt: 1234567890,
  lastActive: 1234567890,
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
}
```

### 2. Initial State

**All dashboard fields start as `null` or empty arrays/objects:**
- Personal information: `null` (phone, location, farmSize, etc.)
- Financial data: `null` (monthlyRevenue, monthlyExpenses, profitMargin)
- Activity history: `[]` (empty array)
- Inventory: `0` (zero products)
- Orders: `[]` (empty arrays)

### 3. Activity Accumulation

As users interact with the system, their data accumulates through the `updateUserActivity()` function:

#### Product Management
- **Adding a product**: Increases `totalListings` and `totalProducts`, adds activity log
- **Updating a product**: Logs the change in activity history
- **Deleting a product**: Decreases `totalListings` and `totalProducts`, adds activity log

#### Order Management
- **Receiving an order**: Increases `pendingOrders`, adds to pending orders list
- **Completing an order**: Decreases `pendingOrders`, increases `completedOrders` and `totalRevenue`

#### Profile Updates
- **Updating profile**: Saves new information and logs the activity

### 4. Data Persistence

All user activity and data changes are automatically saved to Firestore in real-time:

```javascript
// Example: Adding a product
await updateUserActivity('product_added', {
  productName: 'Fresh Tomatoes',
  price: 50,
  stock: 100
});
```

This updates:
- `stats.totalListings` (+1)
- `dashboard.inventory.totalProducts` (+1)
- `dashboard.recentActivity` (adds new activity entry)
- `lastActive` timestamp

### 5. Data Loading on Login

When a user logs back in, the system automatically:

1. **Loads their complete profile** from Firestore
2. **Populates all dashboard sections** with saved data
3. **Shows accumulated statistics** (total listings, revenue, etc.)
4. **Displays recent activity** from their last session
5. **Loads their product inventory** and order history

## Database Collections Structure

```
users/
  {userId}/
    - profile data (stats, preferences, etc.)
    - dashboard data (activity, financial, inventory)
    products/
      - {productId1}: {name, price, stock, createdAt}
      - {productId2}: {name, price, stock, createdAt}
    orders/
      - {orderId1}: {productName, buyer, amount, status, timestamp}
      - {orderId2}: {productName, buyer, amount, status, timestamp}
```

## Key Functions

### `ensureUserDoc()`
- Creates new user profile with null defaults
- Called automatically on first login

### `updateUserActivity(activityType, data)`
- Tracks all user actions
- Updates relevant statistics
- Maintains activity history

### `loadCompleteUserProfile()`
- Retrieves full user profile from database
- Used to populate dashboard on login

### `loadDashboardSections(profile)`
- Renders saved data in dashboard UI
- Handles null values gracefully

## Benefits

1. **Clean Start**: New users see empty, organized dashboard
2. **Progressive Enhancement**: Data builds up naturally over time
3. **Persistent State**: All activity is saved and restored on login
4. **Scalable**: Easy to add new dashboard sections and track new activities
5. **User Experience**: Users never lose their progress or data

## Example User Journey

1. **Day 1**: User signs up → Sees empty dashboard with null values
2. **Day 1**: User adds 3 products → Dashboard shows 3 products, activity log
3. **Day 2**: User logs out and back in → Dashboard shows same 3 products + activity
4. **Day 3**: User receives an order → Dashboard shows pending order + updated stats
5. **Day 4**: User logs in → All previous data is restored, order still pending

## Adding New Dashboard Sections

To add new dashboard sections:

1. **Update `ensureUserDoc()`** to initialize new fields to null
2. **Add data attributes** to HTML elements (e.g., `data-new-section`)
3. **Update `loadDashboardSections()`** to populate new sections
4. **Add activity tracking** in relevant functions

This system ensures that every user interaction is tracked, saved, and restored, providing a seamless experience across sessions.



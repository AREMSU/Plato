# Plato Frontend Handoff (May 16, 2026)
Backend Developer: Aditya Dev Joshi

## Purpose
This is a concise frontend handoff with only the context needed to continue UI work.

## Backend Completed
- Pro subscription backend is implemented (mock payment).
- Cloudinary image upload flow is integrated and meal images now store real URLs.
- Frontend integration bugs in API client/context were fixed.

## Subscription Contract
Plan pricing:
- Free: NPR 0
- Pro: NPR 199/month

Behavior:
- Upgrading to Pro sets seller meals as featured.
- Featured meals are returned first in `GET /api/meals/`.
- Cancel/expiry removes featured status.
- Pro duration is 30 days per upgrade/renew.

Headers for subscription endpoints:
- `Authorization: Bearer <access_token>`
- `ngrok-skip-browser-warning: true`

Endpoints:
- `GET /api/subscription/`
- `POST /api/subscription/upgrade/`
- `POST /api/subscription/cancel/`
- `POST /api/subscription/renew/`

## Frontend Team Instructions (Next Steps)
Before starting, pull backend changes:

```bash
git pull origin Aditya-Dev-Joshi
```

### Task 1: Update `src/context/AppContext.jsx` (HIGH)
Add state:

```javascript
const [subscription, setSubscription] = useState(null);
```

Add functions:

```javascript
const getSubscription = async () => {
  const data = await apiCall('/subscription/', 'GET', null, true);
  if (!data?.error) setSubscription(data);
  return data;
};

const upgradeSubscription = async () => {
  const data = await apiCall('/subscription/upgrade/', 'POST', null, true);
  if (!data?.error) await getSubscription();
  return data;
};

const cancelSubscription = async () => {
  const data = await apiCall('/subscription/cancel/', 'POST', null, true);
  if (!data?.error) await getSubscription();
  return data;
};

const renewSubscription = async () => {
  const data = await apiCall('/subscription/renew/', 'POST', null, true);
  if (!data?.error) await getSubscription();
  return data;
};
```

In both `login()` and `loginAfterVerification()`, run `await getSubscription();` after `await loadMeals();`.

Expose in provider value:
- `subscription`
- `getSubscription`
- `upgradeSubscription`
- `cancelSubscription`
- `renewSubscription`

### Task 2: Create `src/screens/SubscriptionScreen.jsx` (HIGH)
Implement:
- Fetch on mount with `getSubscription()`
- Loading state while fetching
- Free plan UI when `!subscription?.isPro`
- Pro plan UI when `subscription?.isPro`
- Confirm alerts before upgrade/renew/cancel
- Success and error alerts after each action

Use:

```javascript
const {
  subscription,
  getSubscription,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription,
} = useApp();
```

Date helper:

```javascript
const formatDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-NP', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
```

### Task 3: Update `src/navigation/AppNavigator.jsx` (HIGH)

```javascript
import SubscriptionScreen from '../screens/SubscriptionScreen';

<Stack.Screen
  name="Subscription"
  component={SubscriptionScreen}
  options={{ headerShown: false }}
/>
```

### Task 4: Update `src/screens/ProfileScreen.jsx` (HIGH)
Add account menu item:

```javascript
<MenuItem
  icon="⭐"
  label="Plato Pro"
  value={user?.isPro ? '✅ Active' : 'Upgrade'}
  color="#FF6B35"
  onPress={() => navigation.navigate('Subscription')}
/>
```

Add Pro badge near the user name:

```javascript
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Text style={styles.userName}>{user?.name}</Text>
  {user?.isPro && (
    <View style={styles.proBadge}>
      <Text style={styles.proBadgeText}>⭐ PRO</Text>
    </View>
  )}
</View>
```

```javascript
proBadge: {
  backgroundColor: '#fff',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},
proBadgeText: {
  color: '#FF6B35',
  fontSize: 12,
  fontWeight: '800',
},
```

### Task 5: Update `src/components/MealCard.jsx` (MEDIUM)

```javascript
{meal.isFeatured && (
  <View style={styles.featuredBadge}>
    <Text style={styles.featuredText}>⭐ Featured</Text>
  </View>
)}
```

```javascript
featuredBadge: {
  position: 'absolute',
  bottom: 12,
  left: 12,
  backgroundColor: '#FF6B35',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 12,
},
featuredText: {
  color: '#fff',
  fontSize: 11,
  fontWeight: '700',
},
```

### Task 6: Verify `loggingOut` usage in `src/screens/ProfileScreen.jsx` (MEDIUM)

```javascript
const { user, logout, loggingOut, meals, bookings } = useApp();

<TouchableOpacity
  style={[styles.logoutButton, loggingOut && { opacity: 0.6 }]}
  onPress={handleLogout}
  disabled={loggingOut}
>
  <Text style={styles.logoutIcon}>🚪</Text>
  <Text style={styles.logoutText}>
    {loggingOut ? 'Logging out...' : 'Log Out'}
  </Text>
</TouchableOpacity>
```

## Task Checklist
- [ ] Task 1: AppContext subscription state/functions
- [ ] Task 2: Create `SubscriptionScreen.jsx`
- [ ] Task 3: Add `Subscription` route to navigator
- [ ] Task 4: Add Pro menu item + badge in Profile
- [ ] Task 5: Add featured badge in MealCard
- [ ] Task 6: Verify `loggingOut` handling in Profile

## API Response Changes Used by Frontend
User object now includes:
- `isPro`
- `subscriptionExpires`

Meal object now includes:
- `isFeatured`

## Frontend Work Required
1. Create `SubscriptionScreen.jsx` (high priority).
2. Add subscription actions/state in `AppContext.jsx`:
   - `subscription`
   - `getSubscription`
   - `upgradeSubscription`
   - `cancelSubscription`
   - `renewSubscription`
3. Add `Subscription` route in `AppNavigator.jsx`.
4. Show Pro badge in `ProfileScreen.jsx` when `user.isPro`.
5. Add featured badge in `MealCard.jsx` when `meal.isFeatured`.
6. Ensure logout button uses `loggingOut` to prevent double taps.

## Frontend Rules (Important)
- Always use camelCase in frontend request bodies (`client.js` handles conversion).
- AsyncStorage keys must be exactly:
  - `access_token`
  - `refresh_token`
  - `user`
- `apiCall` returns `{ error: ... }` on failure; check `result?.error`.
- Always null-check image URI before rendering `<Image>`.
- Update `src/api/config.js` with current ngrok URL each session.

## Not Implemented Yet
- Real payment integration (eSewa/Khalti).
- Token auto-refresh.
- Push notifications.
- Profile avatar persistence to backend.
- Ratings/reviews endpoints.
- Production cloud deployment.

## Changed Files Reference
- `src/api/client.js`
- `src/api/uploadImage.js`
- `src/context/AppContext.jsx`
- `src/screens/AddMealScreen.jsx`
- `src/screens/HomeScreen.jsx`
- `plato_backend/api/models.py`
- `plato_backend/api/serializers.py`
- `plato_backend/api/views.py`
- `plato_backend/api/urls.py`

Last updated: May 16, 2026
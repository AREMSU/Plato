# Plato

Plato is a React Native + Expo mobile app for student-to-student meal sharing.
Users can list home-cooked meals, discover nearby listings, book portions, and manage bookings.

The current branch targets Expo SDK 54.

This README is written as both:
- Product documentation for humans
- A reconstruction blueprint for AI agents

## 1) Product Overview

### Core idea
Students cook and share extra meals with other students on campus.

### Primary user flows
1. App launch: Splash -> Onboarding -> Login/Register
2. Buyer flow: Home/Explore -> Meal Detail -> Booking -> My Meals
3. Seller flow: Add Meal -> Listing visible in feed -> Track own listings in My Meals
4. Profile flow: Edit profile avatar/details, view reliability, logout

### Demo login
- Email: `aarnav@student.edu`
- Password: `123456`

## 2) Tech Stack

- React `19.1.0`
- React Native `0.81.5`
- Expo `54.0.34`
- React Navigation:
  - `@react-navigation/native` `6.1.9`
  - `@react-navigation/stack` `6.3.20`
  - `@react-navigation/bottom-tabs` `6.5.11`
- expo-image-picker `17.0.11`
- expo-linear-gradient `15.0.8`
- AsyncStorage `1.21.0` (installed, not actively used for persistence)
- react-native-reanimated `4.1.1`
- Babel + `react-native-reanimated/plugin`

## 3) Scripts

From `package.json`:

```bash
npm start
npm run android
npm run ios
```

No lint/test scripts are currently configured.

## 4) Setup and Run

## Prerequisites
- Node.js 18+
- npm
- Expo tooling (`npx expo` works; global install optional)
- Android Studio emulator or physical Android device for Android testing

## Install

```bash
npm install
```

## Start dev server

```bash
npm start
```

Then:
- press `a` for Android emulator/device
- or scan QR with Expo Go

## Android direct run shortcut

```bash
npm run android
```

## 5) Project Structure

```text
plato/
  App.jsx
  app.json
  babel.config.js
  package.json
  android/
  src/
    components/
      AIRecommendation.jsx
      BookingCard.jsx
      CategoryFilter.jsx
      Header.jsx
      MealCard.jsx
      RatingStars.jsx
      UserAvatar.jsx
    context/
      AppContext.jsx
    data/
      mockData.js
    navigation/
      AppNavigator.jsx
    screens/
      AddMealScreen.jsx
      BookingScreen.jsx
      ExploreScreen.jsx
      HomeScreen.jsx
      LoginScreen.jsx
      MealDetailScreen.jsx
      MyMealsScreen.jsx
      OnboardingScreen.jsx
      ProfileScreen.jsx
      RegisterScreen.jsx
      SplashScreen.jsx
    utils/
      helpers.js
```

## 6) Runtime Architecture

## Root composition (`App.jsx`)
1. Import `react-native-gesture-handler`
2. Show `SplashScreen` for 2500ms with local `isLoading` state
3. Wrap app with:
   - `AppProvider` (global context)
   - `NavigationContainer`
   - `StatusBar` (light, orange background)
4. Render `AppNavigator`

## Global state (`src/context/AppContext.jsx`)
State fields:
- `user`
- `meals` (initialized from `mockMeals`)
- `bookings`
- `isLoggedIn`
- `cart` (placeholder)

Actions exposed by context:
- `login(email, password)`
- `register(userData)`
- `logout()`
- `addMeal(mealData)`
- `bookMeal(meal, portions)`
- `cancelBooking(bookingId)`
- `getAIRecommendations()`

Behavior details:
- `login` validates against `mockUsers`
- `register` creates a new in-memory user and auto-logs in
- `bookMeal`:
  - creates a booking record
  - decrements meal `availablePortions`
  - increments meal `bookings`
- `cancelBooking` only changes booking status to `cancelled`
- `getAIRecommendations` is random shuffle + first 3 meals (not ML)

## Navigation (`src/navigation/AppNavigator.jsx`)
Navigation is Stack + Bottom Tabs.

Unauthenticated stack:
- `Onboarding`
- `Login`
- `Register`

Authenticated stack:
- `Main` (tabs)
- `MealDetail`
- `Booking`

Main tab routes:
- `Home`
- `Explore`
- `Add`
- `MyMeals`
- `Profile`

## 7) Screen-by-Screen Functional Contract

## `SplashScreen`
- Visual splash with branding
- Auto advances after 2.5s (handled by `App.jsx`)

## `OnboardingScreen`
- Multi-slide intro carousel
- CTA routes to auth flow

## `LoginScreen`
- Email/password form
- Validates input and calls `login`
- Demo autofill path exists

## `RegisterScreen`
- Collects name, email, university, password, confirm password
- Validates fields and password match
- Calls `register`

## `HomeScreen`
- Greeting + user avatar
- Search entry point to Explore
- Displays stats + active bookings summary
- Shows AI recommendation cards
- Category filter + meal listing

## `ExploreScreen`
- Full browse/search interface
- Filters:
  - category
  - diet (all/vegetarian/non-veg)
- Sort:
  - rating
  - price
  - newest

## `AddMealScreen`
- Form for creating meal listing
- Required fields:
  - image
  - title
  - description
  - pricePerPortion
  - totalPortions
  - pickupTime
  - pickupLocation
- Category defaults to `Nepali`
- Optional tags are comma-separated and normalized to lowercase array
- On submit calls `addMeal(...)` with derived fields:
  - `availablePortions = totalPortions`
  - `rating = 0`
  - `reviews = 0`
  - `calories = 400`
  - `protein = 15`
  - `mealDate = today`

## `MealDetailScreen`
- Shows full meal details, nutrition, seller info
- Portion selector for booking
- If current user is seller: booking disabled with informational state
- If sold out: disabled state
- Otherwise allows booking route

## `BookingScreen`
- Booking confirmation UI
- Payment option selection (UI-only): eSewa / Khalti / Cash
- Shows cancellation policy (30% fee)
- On confirm calls `bookMeal`

## `MyMealsScreen`
- Two modes:
  - Bookings
  - My meal listings
- Booking cards show confirmed/cancelled status
- Cancel booking path applies status update
- Computes seller earnings from bookings on user-owned meals

## `ProfileScreen`
- Shows profile and reliability badge
- Supports avatar pick/change/remove
- Modal sections for:
  - profile edit
  - notifications
  - dietary preferences
  - payment methods
  - reviews
- Logout action calls `logout`

## 8) Reusable Components Contract

## `MealCard`
Props:
- `meal`
- `onPress`

Responsibilities:
- Render compact meal details
- Show sold-out and vegetarian badges
- Display seller/rating/location info

## `AIRecommendation`
Props:
- `meals`
- `onMealPress`

Responsibilities:
- Horizontal card strip for highlighted meals

## `CategoryFilter`
Props:
- `categories`
- `selected`
- `onSelect`

Responsibilities:
- Horizontal category chips with active/inactive state

## `RatingStars`
Props:
- `rating`
- `size`

Responsibilities:
- Renders 5-star representation with half-star character logic

## `UserAvatar`
Props:
- `uri`
- `name`
- `size`
- `loading`
- `borderColor`
- `borderWidth`

Responsibilities:
- Avatar image or fallback initial

## `BookingCard`
Props:
- `booking`
- `onCancel`

Responsibilities:
- Booking summary with status chip and optional cancel action

## `Header`
Props:
- `title`
- `subtitle`
- `onBack`
- `rightIcon`
- `onRightPress`

Responsibilities:
- Gradient app header with optional back/right action buttons

## 9) Data Contracts

Source file: `src/data/mockData.js`

### User shape
```js
{
  id: string,
  name: string,
  email: string,
  password: string,
  avatar: string,
  rating: number,
  mealsShared: number,
  university: string,
  bio: string,
  joinedDate: ISOString
}
```

### Meal shape
```js
{
  id: string,
  title: string,
  description: string,
  category: 'Nepali' | 'Continental' | 'Chinese' | 'Snacks' | 'Breakfast',
  pricePerPortion: number,
  totalPortions: number,
  availablePortions: number,
  bookings: number,
  isVegetarian: boolean,
  image: string,
  sellerId: string,
  sellerName: string,
  sellerAvatar: string,
  sellerRating: number,
  pickupTime: string,
  pickupLocation: string,
  mealDate: string,
  tags: string[],
  rating: number,
  reviews: number,
  calories: number,
  protein: number,
  createdAt: ISOString
}
```

### Booking shape
```js
{
  id: string,
  meal: Meal,
  portions: number,
  totalCost: number,
  status: 'confirmed' | 'cancelled',
  bookedAt: ISOString,
  userId: string
}
```

## 10) Utility Rules (`src/utils/helpers.js`)

- Currency format: `Rs. <amount>`
- Cancellation fee: `Math.round(total * 0.3)`
- Refund: `total - fee`
- Reliability badge thresholds:
  - `>= 4.8` -> Top Chef
  - `>= 4.5` -> Trusted
  - `>= 4.0` -> Good
  - else -> New
- Greeting by local hour:
  - morning `<12`
  - afternoon `<17`
  - evening otherwise

## 11) Android Build Notes

Key Android config from `android/`:
- minSdkVersion: `23`
- targetSdkVersion: `34`
- compileSdkVersion: `34`
- buildToolsVersion: `34.0.0`
- Kotlin: `1.8.10`
- Hermes: enabled (`hermesEnabled=true`)
- Architectures: `armeabi-v7a, arm64-v8a, x86, x86_64`

Manifest permissions currently include:
- INTERNET
- SYSTEM_ALERT_WINDOW
- VIBRATE
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE

Note:
- `newArchEnabled` differs by config source:
  - `app.json`: true
  - `android/gradle.properties`: false
  This is common in evolving RN/Expo projects; align both values if you standardize native builds.

## 12) Known Limitations

- No backend/API (all in-memory)
- No persisted app state on restart
- No real payment integration
- No true AI model for recommendations
- No tests or linting configured
- Mock authentication with plain-text passwords in local mock data

## 13) Reconstruction Blueprint (For AI Agents)

Use this sequence to recreate the application with matching behavior.

1. Bootstrap Expo app with React Native 0.73 / Expo 50 compatible setup.
2. Install navigation packages and required native dependencies.
3. Create `AppContext` with exact state and actions listed above.
4. Seed app with mock users/meals/categories/diet filters from data contracts.
5. Implement navigation gates:
   - pre-auth stack
   - post-auth tabs + detail/booking stack screens
6. Build auth screens with validation and context action wiring.
7. Build home/explore with meal filtering/sorting and recommendation cards.
8. Build add-meal form with image picker permission handling and required validations.
9. Build meal detail + booking checkout flow and booking mutation logic.
10. Build my-meals and profile management screens.
11. Add helper utilities for formatting and reliability badges.
12. Match orange-led visual style (`#FF6B35`) and emoji iconography from components.
13. Verify user journeys manually:
    - login/register
    - add listing
    - book listing
    - cancel booking
    - logout

## 14) Suggested Next Engineering Steps

1. Add AsyncStorage persistence for user/session/meals/bookings.
2. Add backend API (auth, meals, bookings, payments).
3. Add ESLint + Prettier + Jest/React Native Testing Library.
4. Replace mock AI with preference/ranking model.
5. Add push notifications and deep links.
6. Add robust error boundaries and offline states.

## 15) License

No explicit license file is currently present in this repository.
If this project is to be shared publicly, add a `LICENSE` file.

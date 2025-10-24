# How to Logout - User Guide

## Where is the Logout Button?

The logout button is located in the **user dropdown menu** in the top-right corner of the screen.

## Steps to Logout

1. **Look at the top-right corner** of the screen
2. **Find the avatar icon** (circular icon with your initial or profile picture)
3. **Click on the avatar** - it will show a dropdown menu
4. **Click "Log out"** in the dropdown menu

## Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│  AI Meeting Assistant              🌙  [👤]  ← Click here│
│  Smart scheduling made simple                            │
└─────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │ User Name   │
                                    │ user@email  │
                                    ├─────────────┤
                                    │ 🚪 Log out  │ ← Click here
                                    └─────────────┘
```

## What Happens When You Logout?

1. Your session is cleared from localStorage
2. Your session is cleared from the backend
3. You are redirected to the Landing Page
4. You'll need to sign in again to access the chat interface

## Alternative: Clear Session Manually

If you want to clear your session without using the logout button (for testing):

### Option 1: Browser Console
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Run:
   ```javascript
   localStorage.clear();
   location.href = '/';
   ```

### Option 2: Application Storage
1. Open Developer Tools (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Click "Local Storage" → `http://localhost:3000`
4. Right-click → "Clear"
5. Refresh the page

## Troubleshooting

### "I don't see the avatar"
- Make sure you're on the chat interface page (`/chat`)
- The avatar only appears when you're logged in
- Check the top-right corner of the header

### "The dropdown doesn't open"
- Make sure you're clicking directly on the avatar
- Try refreshing the page
- Check browser console for errors

### "I clicked logout but nothing happened"
- Check browser console for errors
- Try the manual clear method above
- Make sure the backend is running on `http://localhost:8080`

## Visual Improvements

The avatar now has:
- ✅ Hover effect (ring appears on hover)
- ✅ Cursor changes to pointer
- ✅ Tooltip showing "Account menu"
- ✅ Colored fallback (emerald background with initial)

The logout menu item has:
- ✅ Red text color
- ✅ Hover background (light red)
- ✅ Logout icon
- ✅ Clear label "Log out"

---

**Note:** The logout functionality is working correctly. You just need to click on the avatar to reveal the dropdown menu!

# Device ID Auto-Generation Implementation

## Overview
This document describes the implementation of automatic device_id generation for the digital signage platform.

## Format
**Pattern**: `C{companyId}-SCREEN-{counter}`

**Examples**:
- Company 1: `C1-SCREEN-001`, `C1-SCREEN-002`, `C1-SCREEN-003`
- Company 2: `C2-SCREEN-001`, `C2-SCREEN-002`
- Company 10: `C10-SCREEN-001`, `C10-SCREEN-002`

## Key Features

### 1. Independent Counter per Company
- Each company has its own counter starting at 001
- Counter increments independently for each company
- No conflicts between companies

### 2. Backward Compatible
- Existing screens with old format (e.g., `SCREEN-001`) continue working
- Player/APK requires NO changes
- MQTT topics remain unchanged
- Database UNIQUE constraint preserved

### 3. Optional Manual Override
- Users can specify custom device_id if needed
- Auto-generation only occurs when device_id is empty
- Validation ensures no duplicates

## Architecture

### Backend Changes

#### 1. Service Layer (`backend/src/services/screen.service.js`)

**New Function**: `generateDeviceIdForCompany(companyId)`
- Queries existing screens for the company
- Finds the highest counter number
- Returns next sequential device_id

```javascript
// Logic:
// 1. Find screens matching C{companyId}-SCREEN-% pattern
// 2. Extract highest number from device_id
// 3. Increment by 1 and pad to 3 digits
// 4. Return C{companyId}-SCREEN-{counter}
```

**Modified Function**: `createScreen(screenData, userPermissions)`
- Auto-generates device_id if empty
- Maintains all existing validations
- Preserves multi-tenancy security

#### 2. Controller Layer (`backend/src/controllers/screens.controller.js`)

**New Endpoint**: `previewDeviceId`
- Returns preview of next device_id without creating screen
- Used by frontend for "Generate" button
- Requires authentication (uses user's companyId)

#### 3. Routes (`backend/src/routes/screens.js`)

**New Route**: `GET /api/screens/preview-device-id`
- Protected route (requires JWT auth)
- Returns: `{ device_id: "C1-SCREEN-003" }`

#### 4. Validation (`backend/src/utils/validation.js`)

**Modified**: `validateScreenData()`
- device_id is now OPTIONAL for creation
- Validation only runs if device_id is provided
- Auto-generation fills empty device_id before validation

### Frontend Changes

#### 1. Screens Page (`frontend/src/pages/Screens.jsx`)

**New Function**: `handleGenerateDeviceId()`
- Calls preview endpoint
- Updates form with generated device_id
- Shows success toast

**Modified UI**:
- **Create Mode**: Device ID field is optional with "Generate" button
- **Edit Mode**: Device ID field remains disabled (immutable)
- Help text: "Se generará automáticamente si se deja vacío"

**User Experience**:
1. Open "Create Screen" modal
2. Enter screen name and select venue
3. Options for device_id:
   - Leave empty → Auto-generates on save
   - Click "Generate" → Preview device_id before saving
   - Manual entry → Use custom device_id

## Database Schema

**No changes required** - UNIQUE constraint on device_id column remains:

```sql
-- Screens table
device_id VARCHAR(255) UNIQUE NOT NULL
```

The format `C{companyId}-SCREEN-{counter}` ensures uniqueness across all companies.

## Security & Multi-Tenancy

### Preserved Security
- ✅ Each company only sees their screens
- ✅ Cannot generate device_id for other companies
- ✅ Cannot create screens in other companies' venues
- ✅ All existing permission checks remain intact

### Implementation
- `previewDeviceId` uses `req.user.companyId` from JWT
- `createScreen` validates venue ownership before generation
- Counter query is scoped to authenticated company

## Player/APK Compatibility

### No Changes Required
- ✅ Player reads device_id from SharedPreferences
- ✅ Format change is transparent to player code
- ✅ MQTT topics work with any device_id format
- ✅ API endpoint `/api/screens/by-device/:deviceId/playlist` unchanged

### How It Works
1. TV Box stores device_id in SharedPreferences
2. MainActivity passes it to WebView URL: `?device=C1-SCREEN-001`
3. Player extracts from URL params
4. Uses device_id for API calls and MQTT subscriptions
5. No code changes needed - just value changes

## Testing Scenarios

### Scenario 1: Auto-Generation
1. Login as Company 1 owner
2. Create screen with empty device_id
3. Expected: Creates screen with `C1-SCREEN-001`
4. Create another screen with empty device_id
5. Expected: Creates screen with `C1-SCREEN-002`

### Scenario 2: Preview
1. Login as Company 2 owner
2. Click "New Screen" → Click "Generate" button
3. Expected: Shows `C2-SCREEN-001` without saving
4. Change name and save
5. Expected: Creates screen with `C2-SCREEN-001`

### Scenario 3: Manual Override
1. Login as any owner
2. Create screen with device_id: `CUSTOM-SCREEN-A`
3. Expected: Creates screen with `CUSTOM-SCREEN-A`
4. Counter remains unaffected

### Scenario 4: Multi-Tenancy
1. Company 1 creates screens → Gets `C1-SCREEN-001`, `C1-SCREEN-002`
2. Company 2 creates screens → Gets `C2-SCREEN-001`, `C2-SCREEN-002`
3. Expected: Independent counters, no conflicts

### Scenario 5: Existing Screens
1. Old screens have device_id: `SCREEN-001`, `SCREEN-002`
2. Create new screen with auto-generation
3. Expected: Generates `C1-SCREEN-001` (ignores old format)
4. Old screens continue working normally

## Error Handling

### Backend Errors
- **Empty venue_id**: "El venue_id es obligatorio"
- **Venue not found**: "Sede no encontrada"
- **No permission**: "No tienes permiso para crear pantallas en esta sede"
- **Duplicate device_id**: "Ya existe una pantalla con ese device_id"
- **Duplicate name**: "Ya existe una pantalla con ese nombre en esta sede"

### Frontend Errors
- Network errors shown via toast
- Form validation prevents empty required fields
- Preview button shows error if generation fails

## Migration Strategy

### No Migration Required
- Existing screens keep their current device_id
- New screens use new format
- Both formats coexist peacefully
- TV Boxes work with both formats

### Optional Cleanup (Future)
If desired to standardize all device_ids:
1. Create script to rename old device_ids to new format
2. Update SharedPreferences on TV Boxes via MQTT command
3. Restart players to load new device_id

**Recommendation**: Not necessary - current implementation supports mixed formats.

## API Documentation

### GET /api/screens/preview-device-id
**Auth**: Required (JWT Bearer token)

**Response**:
```json
{
  "device_id": "C1-SCREEN-003"
}
```

**Use Case**: Preview next device_id before creating screen

### POST /api/screens
**Auth**: Required

**Request Body**:
```json
{
  "name": "Pantalla Recepción",
  "device_id": "",  // Optional - auto-generates if empty
  "venue_id": 1,
  "orientation": "landscape"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Pantalla creada exitosamente",
  "screen": {
    "id": 5,
    "name": "Pantalla Recepción",
    "device_id": "C1-SCREEN-003",
    "venue_id": 1,
    "orientation": "landscape",
    "status": "offline"
  }
}
```

## Files Modified

### Backend
1. `backend/src/services/screen.service.js`
   - Added `generateDeviceIdForCompany()` function
   - Modified `createScreen()` to auto-generate device_id
   - Exported new function

2. `backend/src/controllers/screens.controller.js`
   - Added `previewDeviceId()` controller
   - Exported new controller

3. `backend/src/routes/screens.js`
   - Added `GET /preview-device-id` route
   - Added import for `previewDeviceId` controller

4. `backend/src/utils/validation.js`
   - Modified `validateScreenData()` to make device_id optional
   - Validation only runs if device_id is provided

### Frontend
1. `frontend/src/pages/Screens.jsx`
   - Added `handleGenerateDeviceId()` function
   - Modified device_id input field UI
   - Added "Generate" button for create mode
   - Added help text for auto-generation
   - Made device_id field disabled in edit mode

## Summary

✅ **Implemented**: Auto-generation with independent counters per company
✅ **Format**: `C{companyId}-SCREEN-{counter}` (e.g., `C1-SCREEN-001`)
✅ **Backward Compatible**: No changes to Player/APK/MQTT
✅ **Secure**: Multi-tenancy preserved, permissions intact
✅ **User-Friendly**: Optional with preview, allows manual override
✅ **Database**: UNIQUE constraint preserved
✅ **No Migration**: Existing screens continue working

The implementation is complete and ready for testing.

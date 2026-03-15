/**
 * Feature barrel — add an import here for each new server feature.
 */

import './auth/auth.feature';
import './admin/admin.feature';
import './chat/chat.feature';
import './vehicles/vehicle-door.feature';
import './vehicles/vehicle-engine.feature';
import './vehicles/vehicle-lock.feature';
import './business/business.feature';
import './business/business.commands';
import './business/dealership.feature';
import './vehicles/vehicle.commands';
import './garage/garage.feature';
import './garage/garage.commands';

// Dev/debug utilities — remove or gate before going live:
import './dev/debug.commands';

/**
 * Feature barrel — add an import here for each new server feature.
 */

import './auth/auth.feature';
import './admin/admin.feature';
import './vehicles/vehicle-trunk.feature';
import './business/business.feature';
import './business/business.commands';
import './business/dealership.feature';
import './vehicles/vehicle.commands';

// Dev/debug utilities — remove or gate before going live:
import './dev/debug.commands';
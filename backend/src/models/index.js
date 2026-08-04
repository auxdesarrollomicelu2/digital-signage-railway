const Company     = require('./Company');
const Venue       = require('./Venue');
const Screen      = require('./Screen');
const Media       = require('./Media');
const ScreenMedia = require('./ScreenMedia');
const AuditLog    = require('./AuditLog');
const ScreenLog   = require('./ScreenLog');

// Company → Venues
Company.hasMany(Venue, { foreignKey: 'company_id', as: 'Venues', onDelete: 'CASCADE' });
Venue.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

// Company → Media
Company.hasMany(Media, { foreignKey: 'company_id', as: 'Media', onDelete: 'CASCADE' });
Media.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

// Company → AuditLogs
Company.hasMany(AuditLog, { foreignKey: 'company_id', as: 'AuditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

// Venue → Screens
Venue.hasMany(Screen,  { foreignKey: 'venue_id', as: 'Screens', onDelete: 'CASCADE' });
Screen.belongsTo(Venue, { foreignKey: 'venue_id', as: 'Venue' });

// Screen → ScreenMedia → Media
Screen.hasMany(ScreenMedia, { foreignKey: 'screen_id', as: 'ScreenMedia', onDelete: 'CASCADE' });
ScreenMedia.belongsTo(Screen, { foreignKey: 'screen_id' });

Media.hasMany(ScreenMedia, { foreignKey: 'media_id', onDelete: 'CASCADE' });
ScreenMedia.belongsTo(Media, { foreignKey: 'media_id', as: 'Media' });

module.exports = { Company, Venue, Screen, Media, ScreenMedia, AuditLog, ScreenLog };

const auditService = require('../services/audit.service');

const listAuditLogs = async (req, res) => {
  try {
    const result = await auditService.listAuditLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error('[listAuditLogs] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const stats = await auditService.getAuditStatistics(req.query);
    res.json(stats);
  } catch (err) {
    console.error('[getAuditStats] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listAuditLogs,
  getAuditStats,
};

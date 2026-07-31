const { AuditLog, Company } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../database');

const listAuditLogs = async (filters) => {
  const {
    page = 1,
    limit = 50,
    action,
    resource_type,
    user_name,
    company_id,
    start_date,
    end_date,
  } = filters;

  const where = {};

  if (action) {
    where.action = action;
  }

  if (resource_type) {
    where.resource_type = resource_type;
  }

  if (user_name) {
    where.user_name = { [Op.iLike]: `%${user_name}%` };
  }

  if (company_id) {
    where.company_id = Number(company_id);
  }

  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at[Op.gte] = new Date(start_date);
    }
    if (end_date) {
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = endDateTime;
    }
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
        required: false,
      },
    ],
  });

  return {
    logs: rows,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
};

const getAuditStatistics = async (filters) => {
  const { start_date, end_date } = filters;

  const where = {};
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at[Op.gte] = new Date(start_date);
    }
    if (end_date) {
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = endDateTime;
    }
  }

  const totalLogs = await AuditLog.count({ where });

  const byAction = await AuditLog.findAll({
    where,
    attributes: [
      'action',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['action'],
    raw: true,
  });

  const byResourceType = await AuditLog.findAll({
    where,
    attributes: [
      'resource_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['resource_type'],
    raw: true,
  });

  const byCompany = await AuditLog.findAll({
    where,
    attributes: [
      'company_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['company_id'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: 10,
    raw: true,
  });

  return {
    totalLogs,
    byAction,
    byResourceType,
    byCompany,
  };
};

module.exports = {
  listAuditLogs,
  getAuditStatistics,
};

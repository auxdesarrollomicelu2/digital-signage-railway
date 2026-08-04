const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const { Venue, Screen } = require('../models');
const { logAudit } = require('../utils/audit');
const companyService = require('../services/company.service');

/**
 * Obtener todas las empresas (solo super admin)
 */
const listCompanies = async (req, res) => {
  try {
    const companies = await companyService.listCompanies(req.query);
    res.json(companies);
  } catch (err) {
    console.error('Error al listar empresas:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtener una empresa por ID con detalles completos
 */
const getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await companyService.getCompanyById(id);

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(company);
  } catch (err) {
    console.error('Error al obtener empresa:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crear una nueva empresa (solo super admin)
 */
const createCompany = async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'create',
      resourceType: 'Company',
      resourceId: company.id,
      resourceName: company.name,
      oldValues: null,
      newValues: { 
        name: company.name, 
        username: company.username, 
        email: company.email, 
        role: company.role, 
        active: company.active 
      },
      companyId: company.id
    });

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      company,
    });
  } catch (err) {
    console.error('Error al crear empresa:', err);
    const statusCode = err.message.includes('obligatorios') || 
                       err.message.includes('inválido') || 
                       err.message.includes('ya está') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * Actualizar una empresa existente
 */
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await companyService.updateCompany(id, req.body);

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'update',
      resourceType: 'Company',
      resourceId: result.company.id,
      resourceName: result.company.name,
      oldValues: result.oldValues,
      newValues: result.newValues,
      companyId: result.company.id
    });

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      company: result.company,
    });
  } catch (err) {
    console.error('Error al actualizar empresa:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('incorrecta') ? 400 :
                       err.message.includes('inválido') || err.message.includes('ya está') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * Eliminar (desactivar) una empresa
 */
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await companyService.deactivateCompany(id);

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'delete',
      resourceType: 'Company',
      resourceId: result.company.id,
      resourceName: result.company.name,
      oldValues: result.oldValues,
      newValues: result.newValues,
      companyId: result.company.id
    });

    res.json({
      success: true,
      message: 'Empresa desactivada exitosamente',
    });
  } catch (err) {
    console.error('Error al desactivar empresa:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('super administrador') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * Eliminar permanentemente una empresa (hard delete)
 */
const hardDeleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await companyService.deleteCompany(id);

    res.json({
      success: true,
      message: 'Empresa eliminada permanentemente',
    });
  } catch (err) {
    console.error('Error al eliminar empresa permanentemente:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('super administrador') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  hardDeleteCompany,
};

/**
 * constants
 */

const InformixTableNames = {
  DocusignEnvelope: 'informixoltp:docusign_envelope',
  TermsOfUseAgreeabilityType: 'common_oltp:terms_of_use_agreeability_type_lu',
  TermsOfUse: 'common_oltp:terms_of_use',
  TermsOfUseType: 'common_oltp:terms_of_use_type',
  TermsOfUseDependency: 'common_oltp:terms_of_use_dependency',
  TermsOfUseDocusignTemplateXref: 'common_oltp:terms_of_use_docusign_template_xref',
  ProjectRoleTermsOfUseXref: 'common_oltp:project_role_terms_of_use_xref',
  UserTermsOfUseBanXref: 'common_oltp:user_terms_of_use_ban_xref',
  UserTermsOfUseXref: 'common_oltp:user_terms_of_use_xref',
  ResourceRoles: 'tcs_catalog:resource_role_lu'
}

const AgreeabilityTypes = {
  Docusignable: {
    id: 4,
    name: 'DocuSignable'
  },
  ElectronicallyAgreeable: {
    id: 3,
    name: 'Electronically-agreeable'
  }
}

module.exports = {
  InformixTableNames,
  AgreeabilityTypes
}

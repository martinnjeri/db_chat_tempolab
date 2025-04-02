/**
 * SQL Enhancer - Adds organization names to doctor queries
 */

/**
 * Enhances SQL queries to include organization names when querying doctors
 * @param sqlQuery The original SQL query
 * @returns The enhanced SQL query
 */
export function enhanceDoctorQueries(sqlQuery: string): string {
  // Check if this is a simple SELECT from doctors
  const isDoctorQuery = /\bfrom\s+doctors\b/i.test(sqlQuery);
  
  if (!isDoctorQuery) {
    return sqlQuery;
  }

  // Check if the query already has a JOIN with organizations
  const hasOrganizationJoin = /\bjoin\s+organizations\b/i.test(sqlQuery);
  
  if (hasOrganizationJoin) {
    return sqlQuery;
  }

  // Check if the query already has organization_name in the SELECT clause
  const hasOrganizationName = /\borganization_name\b/i.test(sqlQuery);

  // Modify the query to include organization name
  let enhancedQuery = sqlQuery;

  // If the query has a WHERE clause
  if (/\bwhere\b/i.test(enhancedQuery)) {
    // Add JOIN before WHERE
    enhancedQuery = enhancedQuery.replace(
      /\bfrom\s+doctors\b(.*?)\bwhere\b/i,
      'FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id$1WHERE'
    );
  } else if (/\border\s+by\b/i.test(enhancedQuery)) {
    // Add JOIN before ORDER BY
    enhancedQuery = enhancedQuery.replace(
      /\bfrom\s+doctors\b(.*?)\border\s+by\b/i,
      'FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id$1ORDER BY'
    );
  } else if (/\bgroup\s+by\b/i.test(enhancedQuery)) {
    // Add JOIN before GROUP BY
    enhancedQuery = enhancedQuery.replace(
      /\bfrom\s+doctors\b(.*?)\bgroup\s+by\b/i,
      'FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id$1GROUP BY'
    );
  } else if (/\blimit\b/i.test(enhancedQuery)) {
    // Add JOIN before LIMIT
    enhancedQuery = enhancedQuery.replace(
      /\bfrom\s+doctors\b(.*?)\blimit\b/i,
      'FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id$1LIMIT'
    );
  } else {
    // Add JOIN at the end
    enhancedQuery = enhancedQuery.replace(
      /\bfrom\s+doctors\b/i,
      'FROM doctors LEFT JOIN organizations ON doctors.organization_id = organizations.id'
    );
  }

  // Add organization_name to the SELECT clause if it's not already there
  if (!hasOrganizationName) {
    enhancedQuery = enhancedQuery.replace(
      /\bselect\b(.*?)\bfrom\b/i,
      'SELECT$1, organizations.name as organization_name FROM'
    );
  }

  console.log("Enhanced query:", enhancedQuery);
  return enhancedQuery;
}

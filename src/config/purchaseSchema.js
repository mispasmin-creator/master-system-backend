const { Prisma } = require('@prisma/client');

// Purchase-system tables/columns whitelist, derived at require-time from the
// Prisma DMMF (i.e. straight from schema.prisma's model/@map declarations).
// Keyed by the exact DB table name (matching the original Supabase table
// strings the ported Purchase App still calls .from("...") with), each entry
// lists the exact DB column names (matching the original Supabase column
// strings, incl. spaces/casing) that are safe to interpolate as SQL
// identifiers because they're validated against this whitelist first.
const TABLE_INDEX = {};

for (const model of Prisma.dmmf.datamodel.models) {
  const dbTable = model.dbName || model.name;
  const columns = {};
  let idField = null;

  for (const field of model.fields) {
    if (field.kind !== 'scalar' && field.kind !== 'enum') continue;
    const dbColumn = field.dbName || field.name;
    columns[dbColumn] = { jsName: field.name, type: field.type, isList: field.isList };
    if (field.isId) idField = { jsName: field.name, dbColumn };
  }

  TABLE_INDEX[dbTable] = { modelName: model.name, columns, idField };
}

function getTableInfo(table) {
  const info = TABLE_INDEX[table];
  if (!info) {
    const err = new Error(`Unknown purchase table: "${table}"`);
    err.status = 400;
    throw err;
  }
  return info;
}

function assertColumn(table, column) {
  const info = getTableInfo(table);
  if (!info.columns[column]) {
    const err = new Error(`Unknown column "${column}" on table "${table}"`);
    err.status = 400;
    throw err;
  }
  return info.columns[column];
}

module.exports = { TABLE_INDEX, getTableInfo, assertColumn };

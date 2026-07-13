import { trim } from "lodash";
import sqlFormatter from "sql-formatter";

interface QueryFormatterMap {
  [syntax: string]: (queryText: string) => string;
}

const QueryFormatters: QueryFormatterMap = {
  sql: queryText => sqlFormatter.format(trim(queryText)),
};

export function isFormatQueryAvailable(syntax: string) {
  return syntax in QueryFormatters;
}

export function formatQuery(queryText: string, syntax: string) {
  if (!isFormatQueryAvailable(syntax)) {
    return queryText;
  }
  const formatter = QueryFormatters[syntax];
  return formatter(queryText);
}

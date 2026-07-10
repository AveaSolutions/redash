/**
 * eslint-config-react-app without Flow (this codebase uses TypeScript, not Flow).
 * Keeps CRA rule set while avoiding the eslint-plugin-flowtype dependency.
 */
const base = require("eslint-config-react-app");

const rules = { ...base.rules };
delete rules["flowtype/define-flow-type"];
delete rules["flowtype/require-valid-file-annotation"];
delete rules["flowtype/use-flow-type"];

module.exports = {
  ...base,
  root: false,
  plugins: base.plugins.filter(plugin => plugin !== "flowtype"),
  rules,
};

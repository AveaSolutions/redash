require("@testing-library/jest-dom");
const { configure } = require("@testing-library/react");

configure({ testIdAttribute: "data-test" });

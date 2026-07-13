import React from "react";
import Popover from "antd/lib/popover";
import QuestionCircleFilledIcon from "@ant-design/icons/QuestionCircleFilled";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

import "./context-help.less";

type OwnContextHelpProps = {
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

type ContextHelpProps = OwnContextHelpProps & typeof ContextHelp.defaultProps;

export default function ContextHelp({ icon, children, ...props }: ContextHelpProps) {
  return (
    <Popover {...props} content={children}>
      {icon || ContextHelp.defaultIcon}
    </Popover>
  );
}

ContextHelp.defaultProps = {
  icon: null,
  children: null,
};

ContextHelp.defaultIcon = <QuestionCircleFilledIcon className="context-help-default-icon" />;

function NumberFormatSpecs() {
  return (
    <Popover content="Use d3-format patterns (e.g. 0,0.00) to control number display.">
      <QuestionCircleFilledIcon className="context-help-default-icon" />
    </Popover>
  );
}

function DateTimeFormatSpecs() {
  const { HelpTriggerComponent } = visualizationsSettings;
  return (
    <HelpTriggerComponent
      title="Formatting Dates and Times"
      href="https://momentjs.com/docs/#/displaying/format/"
      className="visualization-editor-context-help">
      {ContextHelp.defaultIcon}
    </HelpTriggerComponent>
  );
}

ContextHelp.NumberFormatSpecs = NumberFormatSpecs;
ContextHelp.DateTimeFormatSpecs = DateTimeFormatSpecs;

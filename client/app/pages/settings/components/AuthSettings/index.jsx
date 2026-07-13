import React from "react";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

import PasswordLoginSettings from "./PasswordLoginSettings";

export default function AuthSettings(props) {
  return (
    <DynamicComponent name="OrganizationSettings.AuthSettings" {...props}>
      <h3 className="m-t-0">Authentication</h3>
      <hr />
      <PasswordLoginSettings {...props} />
    </DynamicComponent>
  );
}

AuthSettings.propTypes = SettingsEditorPropTypes;
AuthSettings.defaultProps = SettingsEditorDefaultProps;

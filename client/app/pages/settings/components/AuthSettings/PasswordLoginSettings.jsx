import React from "react";
import Alert from "antd/lib/alert";
import Form from "antd/lib/form";
import Checkbox from "antd/lib/checkbox";
import Tooltip from "@/components/Tooltip";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function PasswordLoginSettings(props) {
  const { settings, values, onChange, loading } = props;

  return (
    <DynamicComponent name="OrganizationSettings.PasswordLoginSettings" {...props}>
      {!loading && !settings.auth_password_login_enabled && (
        <Alert
          message="Password based login is currently disabled."
          type="warning"
          className="m-t-15 m-b-15"
        />
      )}
      <Form.Item label="Password Login">
        {loading ? (
          <Skeleton title={{ width: 300 }} paragraph={false} active />
        ) : (
          <Checkbox
            checked={values.auth_password_login_enabled}
            disabled
            onChange={e => onChange({ auth_password_login_enabled: e.target.checked })}>
            <Tooltip
              title="Password login is the only supported authentication method."
              placement="right">
              Password Login Enabled
            </Tooltip>
          </Checkbox>
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

PasswordLoginSettings.propTypes = SettingsEditorPropTypes;

PasswordLoginSettings.defaultProps = SettingsEditorDefaultProps;

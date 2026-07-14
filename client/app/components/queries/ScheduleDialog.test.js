import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import moment from "moment";
import ScheduleDialog, { TimeEditor } from "./ScheduleDialog";
import RefreshScheduleDefault from "../proptypes";

const defaultProps = {
  schedule: RefreshScheduleDefault,
  refreshOptions: [
    60,
    300,
    600,
    3600,
    36000,
    82800,
    86400,
    172800,
    518400,
    604800,
    1209600,
  ],
  dialog: {
    props: {
      visible: true,
      onOk: () => {},
      onCancel: () => {},
      afterClose: () => {},
    },
    close: () => {},
    dismiss: () => {},
  },
};

function renderSchedule(schedule = {}, { onConfirm, onCancel, ...props } = {}) {
  onConfirm = onConfirm || (() => {});
  onCancel = onCancel || (() => {});

  const mergedProps = {
    ...defaultProps,
    ...props,
    schedule: {
      ...RefreshScheduleDefault,
      ...schedule,
    },
    dialog: {
      props: {
        visible: true,
        onOk: onConfirm,
        onCancel,
        afterClose: () => {},
      },
      close: onConfirm,
      dismiss: onCancel,
    },
  };

  return render(<ScheduleDialog.Component {...mergedProps} />);
}

describe("ScheduleDialog", () => {
  describe("Sets correct schedule settings", () => {
    test('Sets to "Never"', () => {
      const { container } = renderSchedule();
      expect(container.querySelector('[data-testid="interval"]')).toMatchSnapshot();
    });

    test('Sets to "5 Minutes"', () => {
      const { container } = renderSchedule({ interval: 300 });
      expect(container.querySelector('[data-testid="interval"]')).toMatchSnapshot();
    });

    test('Sets to "2 Hours"', () => {
      const { container } = renderSchedule({ interval: 7200 });
      expect(container.querySelector('[data-testid="interval"]')).toMatchSnapshot();
    });

    describe('Sets to "1 Day 22:15"', () => {
      test("Sets to correct interval", () => {
        const { container } = renderSchedule({
          interval: 86400,
          time: "22:15",
        });
        expect(container.querySelector('[data-testid="interval"]')).toMatchSnapshot();
      });

      test("Sets to correct time", () => {
        const { container } = renderSchedule({
          interval: 86400,
          time: "22:15",
        });
        expect(container.querySelector('[data-testid="time"]')).toMatchSnapshot();
      });
    });

    describe("TimeEditor", () => {
      const defaultValue = moment()
        .hour(5)
        .minute(25);

      test("UTC set correctly on init", () => {
        const { container } = render(<TimeEditor defaultValue={defaultValue} onChange={() => {}} />);
        expect(container.querySelector('[data-testid="utc"]')).toHaveTextContent("(03:25 UTC)");
      });

      test("UTC time should not render", () => {
        const utcValue = moment.utc(defaultValue);
        const { container } = render(<TimeEditor defaultValue={utcValue} onChange={() => {}} />);
        expect(container.querySelector('[data-testid="utc"]')).toBeNull();
      });

      // Disabling this test as the TimePicker wasn't setting values from here after Antd v4
      // eslint-disable-next-line jest/no-disabled-tests
      test.skip("onChange correct result", () => {});
    });

    describe('Sets to "2 Weeks 22:15 Tuesday"', () => {
      test("Sets to correct interval", () => {
        const { container } = renderSchedule({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        expect(container.querySelector('[data-testid="interval"]')).toMatchSnapshot();
      });

      test("Sets to correct time", () => {
        const { container } = renderSchedule({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        expect(container.querySelector('[data-testid="time"]')).toMatchSnapshot();
      });

      test("Sets to correct weekday", () => {
        const { container } = renderSchedule({
          interval: 1209600,
          time: "22:15",
          day_of_week: "Monday",
        });
        expect(container.querySelector('[data-testid="weekday"]')).toMatchSnapshot();
      });
    });

    describe("Until feature", () => {
      test("Until not set", () => {
        const { container } = renderSchedule({ interval: 300 });
        expect(container.querySelector('[data-testid="ends"]')).toMatchSnapshot();
      });

      test("Until is set", () => {
        const { container } = renderSchedule({ interval: 300, until: "2030-01-01" });
        expect(container.querySelector('[data-testid="ends"]')).toMatchSnapshot();
      });
    });

    describe("Supports 30 days interval with no time value", () => {
      test("Time is none", () => {
        const { container } = renderSchedule({ interval: 30 * 24 * 3600 });
        expect(container.querySelector('[data-testid="time"]')).toMatchSnapshot();
      });
    });
  });

  describe("Adheres to user permissions", () => {
    test("Shows correct interval options", () => {
      renderSchedule(null, { refreshOptions: [60, 300, 3600, 7200] });

      fireEvent.mouseDown(screen.getByRole("combobox"));
      const options = document.querySelectorAll(".ant-select-item-option-content");
      const texts = Array.from(options).map(node => node.textContent);
      const expected = ["Never", "1 minute", "5 minutes", "1 hour", "2 hours"];

      expect(options.length).toEqual(expected.length);
      expect(texts).toEqual(expected);
    });
  });

  describe("Modal Confirm/Cancel feature", () => {
    const confirmCb = jest.fn().mockName("confirmCb");
    const closeCb = jest.fn().mockName("closeCb");
    const initProps = { onConfirm: confirmCb, onCancel: closeCb };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("Query saved on confirm if state changed", () => {
      renderSchedule(null, initProps);

      fireEvent.mouseDown(screen.getByRole("combobox"));
      fireEvent.click(screen.getByText("5 minutes"));
      fireEvent.click(screen.getByRole("button", { name: "OK" }));

      expect(confirmCb).toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Query not saved on confirm if state unchanged", () => {
      renderSchedule(null, initProps);

      fireEvent.click(screen.getByRole("button", { name: "OK" }));

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });

    test("Cancel closes modal and query unsaved", () => {
      renderSchedule(null, initProps);

      fireEvent.mouseDown(screen.getByRole("combobox"));
      fireEvent.click(screen.getByText("5 minutes"));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(confirmCb).not.toHaveBeenCalled();
      expect(closeCb).toHaveBeenCalled();
    });
  });
});

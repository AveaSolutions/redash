import { fireEvent } from "@testing-library/react";
import { after } from "lodash";
import React from "react";
import { screen } from "@testing-library/react";

import {
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import ColorsSettings from "./ColorsSettings";

function openSelect(container: HTMLElement, testId: string): void {
  const wrapper = queryByDataTest(container, testId);
  const combobox = wrapper?.querySelector('[role="combobox"]');
  if (!combobox) {
    throw new Error(`Missing combobox under [data-test="${testId}"]`);
  }
  fireEvent.mouseDown(combobox);
}

function clickColorPickerTrigger(container: HTMLElement, seriesKey: string): void {
  const rows = container.querySelectorAll("tr");
  for (const row of rows) {
    if (row.textContent?.includes(seriesKey)) {
      const trigger = row.querySelector(".color-picker-trigger");
      if (trigger) {
        fireEvent.click(trigger);
        return;
      }
    }
  }
  throw new Error(`Missing color picker trigger for "${seriesKey}"`);
}

function clickColorPickerTriggerAt(container: HTMLElement, index: number): void {
  const triggers = container.querySelectorAll(".color-picker-trigger");
  const trigger = triggers[index];
  if (!trigger) {
    throw new Error(`Missing color picker trigger at index ${index}`);
  }
  fireEvent.click(trigger);
}

function clickSelectOption(testId: string): void {
  fireEvent.click(screen.getByTestId(testId));
}

function changeColorPickerValue(value: string, submit = false): void {
  const pickers = screen.getAllByTestId("ColorPicker");
  const picker = pickers[pickers.length - 1];
  const input = picker.querySelector("input");
  if (!input) {
    throw new Error('Missing input under [data-test="ColorPicker"]');
  }
  fireEvent.change(input, { target: { value } });
  if (submit) {
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  }
}

function renderEditor(options: any, done?: () => void) {
  options = getOptions(options);
  return renderOptionsEditor(
    <ColorsSettings
      visualizationName="Test"
      data={{
        columns: [
          { name: "a", type: "string" },
          { name: "b", type: "number" },
        ],
        rows: [{ a: "v", b: 3.14 }],
      }}
      options={options}
      onOptionsChange={() => {}}
    />,
    done
  );
}

describe("Visualizations -> Chart -> Editor -> Colors Settings", () => {
  describe("for pie", () => {
    test("Changes series color", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "pie",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      clickColorPickerTrigger(container, "v");
      changeColorPickerValue("red");
    });
  });

  describe("for heatmap", () => {
    test("Changes color scheme", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      openSelect(container, "Chart.Colors.Heatmap.ColorScheme");
      clickSelectOption("Chart.Colors.Heatmap.ColorScheme.Blues");
    });

    test("Sets custom color scheme", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "heatmap",
          columnMapping: { a: "x", b: "y" },
          colorScheme: "Custom...",
        },
        after(2, done)
      ); // we will perform 2 actions, so call `done` after all of them completed

      clickColorPickerTriggerAt(container, 0);
      changeColorPickerValue("yellow", true);

      clickColorPickerTriggerAt(container, 1);
      changeColorPickerValue("red", true);
    });
  });

  describe("for all except of pie and heatmap", () => {
    test("Changes series color", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "column",
          columnMapping: { a: "x", b: "y" },
        },
        done
      );

      clickColorPickerTrigger(container, "b");
      changeColorPickerValue("red");
    });
  });
});

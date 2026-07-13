import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import {
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import SeriesSettings from "./SeriesSettings";

function openSelect(container: HTMLElement, testId: string): void {
  const wrapper = queryByDataTest(container, testId);
  const combobox = wrapper?.querySelector('[role="combobox"]');
  if (!combobox) {
    throw new Error(`Missing combobox under [data-test="${testId}"]`);
  }
  fireEvent.mouseDown(combobox);
}

function changeValue(container: HTMLElement, testId: string, value: string): void {
  const el = queryByDataTest(container, testId);
  if (!el) {
    throw new Error(`Missing [data-test="${testId}"]`);
  }
  const input =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : el.querySelector("input, textarea");
  if (!input) {
    throw new Error(`Missing input under [data-test="${testId}"]`);
  }
  fireEvent.change(input, { target: { value } });
}

function clickSelectOption(testId: string): void {
  fireEvent.click(screen.getByTestId(testId));
}

function setInputChecked(testId: string, checked: boolean): void {
  const el = screen.getByTestId(testId);
  const input = el instanceof HTMLInputElement ? el : el.querySelector("input");
  if (!input) {
    throw new Error(`Missing input for [data-test="${testId}"]`);
  }
  if ((input as HTMLInputElement).checked !== checked) {
    fireEvent.click(input);
  }
}

function renderEditor(options: any, done: () => void) {
  options = getOptions(options);
  return renderOptionsEditor(
    <SeriesSettings
      visualizationName="Test"
      data={{ columns: [{ name: "a", type: "string" }], rows: [{ a: "test" }] }}
      options={options}
    />,
    done
  );
}

describe("Visualizations -> Chart -> Editor -> Series Settings", () => {
  test("Changes series type", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", label: "a", yAxis: 0 },
        },
      },
      done
    );

    openSelect(container, "Chart.Series.a.Type");
    clickSelectOption("Chart.ChartType.area");
  });

  test("Changes series label", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", label: "a", yAxis: 0 },
        },
      },
      done
    );

    changeValue(container, "Chart.Series.a.Label", "test");
  });

  test("Changes series axis", done => {
    renderEditor(
      {
        globalSeriesType: "column",
        columnMapping: { a: "y" },
        seriesOptions: {
          a: { type: "column", name: "a", yAxis: 0 },
        },
      },
      done
    );

    setInputChecked("Chart.Series.a.UseRightAxis", true);
  });
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  clickDataTest,
  elementExists,
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import YAxisSettings from "./YAxisSettings";

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

function renderEditor(options: any, done?: () => void) {
  options = getOptions(options);
  const component = (
    <YAxisSettings visualizationName="Test" data={{ columns: [], rows: [] }} options={options} />
  );

  if (done) {
    return renderOptionsEditor(component, done);
  }

  return render(
    <YAxisSettings
      visualizationName="Test"
      data={{ columns: [], rows: [] }}
      options={options}
      onOptionsChange={() => {}}
    />
  );
}

describe("Visualizations -> Chart -> Editor -> Y-Axis Settings", () => {
  test("Changes axis type", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    openSelect(container, "Chart.LeftYAxis.Type");
    clickSelectOption("Chart.LeftYAxis.Type.Category");
  });

  test("Changes axis name", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    changeValue(container, "Chart.LeftYAxis.Name", "test");
  });

  test("Changes axis min value", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    changeValue(container, "Chart.LeftYAxis.RangeMin", "50");
  });

  test("Changes axis max value", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      },
      done
    );

    changeValue(container, "Chart.LeftYAxis.RangeMax", "200");
  });

  describe("for non-heatmap", () => {
    test("Right Y Axis should be available", () => {
      const { container } = renderEditor({
        globalSeriesType: "column",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists(container, "Chart.RightYAxis.Type")).toBeTruthy();
    });
  });

  describe("for heatmap", () => {
    test("Right Y Axis should not be available", () => {
      const { container } = renderEditor({
        globalSeriesType: "heatmap",
        yAxis: [{ type: "linear" }, { type: "linear", opposite: true }],
      });

      expect(elementExists(container, "Chart.RightYAxis.Type")).toBeFalsy();
    });

    test("Sets Sort X Values option", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "heatmap",
          sortY: false,
        },
        done
      );

      clickDataTest(container, "Chart.LeftYAxis.Sort");
    });

    test("Sets Reverse Y Values option", done => {
      const { container } = renderEditor(
        {
          globalSeriesType: "heatmap",
          reverseY: false,
        },
        done
      );

      clickDataTest(container, "Chart.LeftYAxis.Reverse");
    });
  });
});

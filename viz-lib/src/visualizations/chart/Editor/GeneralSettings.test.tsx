import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  elementExists,
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import GeneralSettings from "./GeneralSettings";

function openSelect(container: HTMLElement, testId: string): void {
  const wrapper = queryByDataTest(container, testId);
  const combobox = wrapper?.querySelector('[role="combobox"]');
  if (!combobox) {
    throw new Error(`Missing combobox under [data-test="${testId}"]`);
  }
  fireEvent.mouseDown(combobox);
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

function renderEditor(options: any, done?: () => void) {
  options = getOptions(options);
  const component = (
    <GeneralSettings visualizationName="Test" data={{ columns: [], rows: [] }} options={options} />
  );

  if (done) {
    return renderOptionsEditor(component, done);
  }

  return render(
    <GeneralSettings
      visualizationName="Test"
      data={{ columns: [], rows: [] }}
      options={options}
      onOptionsChange={() => {}}
    />
  );
}

describe("Visualizations -> Chart -> Editor -> General Settings", () => {
  test("Changes global series type", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        showDataLabels: false,
        seriesOptions: {
          a: { type: "column" },
          b: { type: "line" },
        },
      },
      done
    );

    openSelect(container, "Chart.GlobalSeriesType");
    clickSelectOption("Chart.ChartType.pie");
  });

  test("Pie: changes direction", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "pie",
        direction: { type: "counterclockwise" },
      },
      done
    );

    openSelect(container, "Chart.PieDirection");
    clickSelectOption("Chart.PieDirection.Clockwise");
  });

  test("Toggles legend", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        legend: { enabled: true },
      },
      done
    );

    openSelect(container, "Chart.LegendPlacement");
    clickSelectOption("Chart.LegendPlacement.HideLegend");
  });

  test("Box: toggles show points", done => {
    renderEditor(
      {
        globalSeriesType: "box",
        showpoints: false,
      },
      done
    );

    setInputChecked("Chart.ShowPoints", true);
  });

  test("Enables stacking", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    openSelect(container, "Chart.Stacking");
    clickSelectOption("Chart.Stacking.Stack");
  });

  test("Toggles normalize values to percentage", done => {
    renderEditor(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    setInputChecked("Chart.NormalizeValues", true);
  });

  test("Keep missing/null values", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        missingValuesAsZero: true,
      },
      done
    );

    openSelect(container, "Chart.MissingValues");
    clickSelectOption("Chart.MissingValues.Keep");
  });

  describe("Column mappings should be available", () => {
    test("for bubble", () => {
      const { container } = renderEditor({
        globalSeriesType: "column",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists(container, "Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.size")).toBeTruthy();
    });

    test("for heatmap", () => {
      const { container } = renderEditor({
        globalSeriesType: "heatmap",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists(container, "Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.zVal")).toBeTruthy();
    });

    test("for all types except of bubble, heatmap and custom", () => {
      const { container } = renderEditor({
        globalSeriesType: "column",
        seriesOptions: {
          a: { type: "column" },
          b: { type: "bubble" },
          c: { type: "heatmap" },
        },
      });

      expect(elementExists(container, "Chart.ColumnMapping.x")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.y")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.series")).toBeTruthy();
      expect(elementExists(container, "Chart.ColumnMapping.yError")).toBeTruthy();
    });
  });

  test("Toggles horizontal bar chart", done => {
    renderEditor(
      {
        globalSeriesType: "column",
        series: {},
      },
      done
    );

    setInputChecked("Chart.SwappedAxes", true);
  });
});

import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import {
  clickDataTest,
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import XAxisSettings from "./XAxisSettings";

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

function renderEditor(options: any, done: () => void) {
  options = getOptions(options);
  return renderOptionsEditor(
    <XAxisSettings visualizationName="Test" data={{ columns: [], rows: [] }} options={options} />,
    done
  );
}

describe("Visualizations -> Chart -> Editor -> X-Axis Settings", () => {
  test("Changes axis type", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    openSelect(container, "Chart.XAxis.Type");
    clickSelectOption("Chart.XAxis.Type.Linear");
  });

  test("Changes axis name", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: true } },
      },
      done
    );

    changeValue(container, "Chart.XAxis.Name", "test");
  });

  test("Sets Show Labels option", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        xAxis: { type: "-", labels: { enabled: false } },
      },
      done
    );

    clickDataTest(container, "Chart.XAxis.ShowLabels");
  });

  test("Sets Sort X Values option", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        sortX: false,
      },
      done
    );

    clickDataTest(container, "Chart.XAxis.Sort");
  });

  test("Sets Reverse X Values option", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        reverseX: false,
      },
      done
    );

    clickDataTest(container, "Chart.XAxis.Reverse");
  });
});

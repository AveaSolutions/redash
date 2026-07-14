import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import { queryByDataTest, renderOptionsEditor } from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import DataLabelsSettings from "./DataLabelsSettings";

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
    <DataLabelsSettings visualizationName="Test" data={{ columns: [], rows: [] }} options={options} />,
    done
  );
}

describe("Visualizations -> Chart -> Editor -> Data Labels Settings", () => {
  test("Sets Show Data Labels option", done => {
    renderEditor(
      {
        globalSeriesType: "column",
        showDataLabels: false,
      },
      done
    );

    setInputChecked("Chart.DataLabels.ShowDataLabels", true);
  });

  test("Changes number format", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        numberFormat: "0[.]0000",
      },
      done
    );

    changeValue(container, "Chart.DataLabels.NumberFormat", "0.00");
  });

  test("Changes percent values format", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        percentFormat: "0[.]00%",
      },
      done
    );

    changeValue(container, "Chart.DataLabels.PercentFormat", "0.0%");
  });

  test("Changes date/time format", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
      },
      done
    );

    changeValue(container, "Chart.DataLabels.DateTimeFormat", "YYYY MMM DD");
  });

  test("Changes data labels format", done => {
    const { container } = renderEditor(
      {
        globalSeriesType: "column",
        textFormat: null,
      },
      done
    );

    changeValue(container, "Chart.DataLabels.TextFormat", "{{ @@x }} :: {{ @@y }} / {{ @@yPercent }}");
  });
});

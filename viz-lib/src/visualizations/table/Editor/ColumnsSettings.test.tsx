import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import {
  clickDataTest,
  queryByDataTest,
  renderOptionsEditor,
} from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import ColumnsSettings from "./ColumnsSettings";

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
  const data = {
    columns: [{ name: "a", type: "string" }],
    rows: [{ a: "test" }],
  };
  options = getOptions(options, data);
  return renderOptionsEditor(
    <ColumnsSettings visualizationName="Test" data={data} options={options} />,
    done
  );
}

describe("Visualizations -> Table -> Editor -> Columns Settings", () => {
  test("Toggles column visibility", done => {
    const { container } = renderEditor({}, done);

    clickDataTest(container, "Table.Column.a.Visibility");
  });

  test("Changes column title", done => {
    const { container } = renderEditor({}, done);
    clickDataTest(container, "Table.Column.a.Name"); // expand settings

    changeValue(container, "Table.Column.a.Title", "test");
  });

  test("Changes column alignment", done => {
    const { container } = renderEditor({}, done);
    clickDataTest(container, "Table.Column.a.Name"); // expand settings

    setInputChecked("TextAlignmentSelect.Right", true);
  });

  test("Enables search by column data", done => {
    const { container } = renderEditor({}, done);
    clickDataTest(container, "Table.Column.a.Name"); // expand settings

    setInputChecked("Table.Column.a.UseForSearch", true);
  });

  test("Changes column display type", done => {
    const { container } = renderEditor({}, done);
    clickDataTest(container, "Table.Column.a.Name"); // expand settings

    openSelect(container, "Table.Column.a.DisplayAs");
    clickSelectOption("Table.Column.a.DisplayAs.number");
  });
});

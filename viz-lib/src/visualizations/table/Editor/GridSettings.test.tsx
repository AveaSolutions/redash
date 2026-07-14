import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import { queryByDataTest, renderOptionsEditor } from "@/testing/rtlUtils";
import getOptions from "../getOptions";
import GridSettings from "./GridSettings";

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

function renderEditor(options: any, done: () => void) {
  const data = { columns: [], rows: [] };
  options = getOptions(options, data);
  return renderOptionsEditor(
    <GridSettings visualizationName="Test" data={data} options={options} />,
    done
  );
}

describe("Visualizations -> Table -> Editor -> Grid Settings", () => {
  test("Changes items per page", done => {
    const { container } = renderEditor(
      {
        itemsPerPage: 25,
      },
      done
    );

    openSelect(container, "Table.ItemsPerPage");
    clickSelectOption("Table.ItemsPerPage.100");
  });
});

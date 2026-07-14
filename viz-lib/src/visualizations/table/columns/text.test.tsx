import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import { queryByDataTest, renderColumnEditor } from "@/testing/rtlUtils";
import Column from "./text";

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

function renderEditor(column: any, done: () => void) {
  return renderColumnEditor(
    <Column.Editor
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ visualizationName: string; column: any; on... Remove this comment to see the full error message
      visualizationName="Test"
      column={column}
    />,
    done
  );
}

describe("Visualizations -> Table -> Columns -> Text", () => {
  describe("Editor", () => {
    test("Enables HTML content", done => {
      renderEditor(
        {
          name: "a",
          allowHTML: false,
          highlightLinks: false,
        },
        done
      );

      setInputChecked("Table.ColumnEditor.Text.AllowHTML", true);
    });

    test("Enables highlight links option", done => {
      renderEditor(
        {
          name: "a",
          allowHTML: true,
          highlightLinks: false,
        },
        done
      );

      setInputChecked("Table.ColumnEditor.Text.HighlightLinks", true);
    });
  });
});

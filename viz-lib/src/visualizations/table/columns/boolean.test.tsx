import React from "react";
import { fireEvent } from "@testing-library/react";

import { queryByDataTest, renderColumnEditor } from "@/testing/rtlUtils";
import Column from "./boolean";

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

describe("Visualizations -> Table -> Columns -> Boolean", () => {
  describe("Editor", () => {
    test("Changes value for FALSE", done => {
      const { container } = renderEditor(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Boolean.False", "no");
    });

    test("Changes value for TRUE", done => {
      const { container } = renderEditor(
        {
          name: "a",
          booleanValues: ["false", "true"],
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Boolean.True", "yes");
    });
  });
});

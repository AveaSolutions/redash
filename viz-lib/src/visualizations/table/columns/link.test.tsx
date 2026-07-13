import React from "react";
import { fireEvent, screen } from "@testing-library/react";

import { queryByDataTest, renderColumnEditor } from "@/testing/rtlUtils";
import Column from "./link";

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

describe("Visualizations -> Table -> Columns -> Link", () => {
  describe("Editor", () => {
    test("Changes URL template", done => {
      const { container } = renderEditor(
        {
          name: "a",
          linkUrlTemplate: "{{ @ }}",
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Link.UrlTemplate", "http://{{ @ }}/index.html");
    });

    test("Changes text template", done => {
      const { container } = renderEditor(
        {
          name: "a",
          linkTextTemplate: "{{ @ }}",
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Link.TextTemplate", "Text of {{ @ }}");
    });

    test("Changes title template", done => {
      const { container } = renderEditor(
        {
          name: "a",
          linkTitleTemplate: "{{ @ }}",
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Link.TitleTemplate", "Title of {{ @ }}");
    });

    test("Makes link open in new tab ", done => {
      renderEditor(
        {
          name: "a",
          linkOpenInNewTab: false,
        },
        done
      );

      setInputChecked("Table.ColumnEditor.Link.OpenInNewTab", true);
    });
  });
});

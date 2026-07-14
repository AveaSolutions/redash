import React from "react";
import { fireEvent } from "@testing-library/react";

import { queryByDataTest, renderColumnEditor } from "@/testing/rtlUtils";
import Column from "./image";

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

describe("Visualizations -> Table -> Columns -> Image", () => {
  describe("Editor", () => {
    test("Changes URL template", done => {
      const { container } = renderEditor(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Image.UrlTemplate", "http://{{ @ }}.jpeg");
    });

    test("Changes width", done => {
      const { container } = renderEditor(
        {
          name: "a",
          imageWidth: null,
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Image.Width", "400");
    });

    test("Changes height", done => {
      const { container } = renderEditor(
        {
          name: "a",
          imageHeight: null,
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Image.Height", "300");
    });

    test("Changes title template", done => {
      const { container } = renderEditor(
        {
          name: "a",
          imageUrlTemplate: "{{ @ }}",
        },
        done
      );

      changeValue(container, "Table.ColumnEditor.Image.TitleTemplate", "Image {{ @ }}");
    });
  });
});
